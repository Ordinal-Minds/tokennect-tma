import { TonClient, WalletContractV4, internal, Address, Cell, beginCell } from 'ton'
import { mnemonicToPrivateKey } from '@ton/crypto'
import { getRuntimeConfig } from '../utils/runtime'

let _client: TonClient | null = null
let _wallet: ReturnType<typeof WalletContractV4.create> | null = null
let _publicKey: Buffer | null = null
let _secretKey: Buffer | null = null

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v || v.trim().length === 0) {
    throw new Error(`${name} is not configured`)
  }
  return v
}

export function getTonClient(): TonClient {
  if (_client) return _client
  const cfg = getRuntimeConfig()
  const endpoint = cfg.tonApiEndpoint || 'https://toncenter.com/api/v2/jsonRPC'
  _client = new TonClient({ endpoint, apiKey: cfg.tonApiKey || '' })
  return _client
}

export async function getBotWallet() {
  if (_wallet && _publicKey && _secretKey) {
    return { wallet: _wallet, publicKey: _publicKey, secretKey: _secretKey }
  }
  const cfg = getRuntimeConfig()
  const mnemonic = cfg.botWalletMnemonic
  const pkHex = cfg.botWalletPrivateKeyHex
  if (!mnemonic && !pkHex) {
    throw new Error('BOT_WALLET_MNEMONIC or BOT_WALLET_PRIVATE_KEY_HEX must be set')
  }
  if (mnemonic) {
    const words = mnemonic.split(/\s+/g).map((w) => w.trim()).filter(Boolean)
    const kp = await mnemonicToPrivateKey(words)
    _publicKey = Buffer.from(kp.publicKey)
    _secretKey = Buffer.from(kp.secretKey)
  } else if (pkHex) {
    // pkHex is expected to be a 64-byte hex (ed25519 secret key)
    const sk = Buffer.from(pkHex.replace(/^0x/i, ''), 'hex')
    if (sk.length !== 64) throw new Error('BOT_WALLET_PRIVATE_KEY_HEX must be 64-byte hex')
    // We don't have public key here; but WalletContractV4 requires pubkey to derive address
    throw new Error('Private key hex path not supported yet; use BOT_WALLET_MNEMONIC')
  }

  if (!_publicKey || !_secretKey) throw new Error('Failed to derive bot wallet keypair')
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: _publicKey })
  _wallet = wallet
  return { wallet, publicKey: _publicKey, secretKey: _secretKey }
}

export async function getBotAddress(params?: { bounceable?: boolean; testOnly?: boolean }): Promise<string> {
  const { wallet } = await getBotWallet()
  const addr = wallet.address
  const friendly = addr.toString({
    bounceable: params?.bounceable ?? true,
    testOnly: params?.testOnly ?? false,
  })
  return friendly
}

export async function sendTon(opts: { to: string; amountTon: string; comment?: string }) {
  const client = getTonClient()
  const { wallet, secretKey } = await getBotWallet()
  const contract = client.open(wallet)
  const seqno = await contract.getSeqno()
  const to = Address.parse(opts.to)
  const value = opts.amountTon
  let body: Cell | undefined
  if (opts.comment && opts.comment.length > 0) {
    body = beginCell().storeUint(0, 32).storeStringTail(opts.comment).endCell()
  }
  const transfer = await contract.createTransfer({
    seqno,
    secretKey,
    messages: [
      internal({ to, value, body })
    ]
  })
  const res = await contract.send(transfer)
  return { ok: true, seqno, result: res }
}

export function validateTonAddress(a: string): boolean {
  try {
    Address.parse(a)
    return true
  } catch {
    return false
  }
}
