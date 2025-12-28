var S = /* @__PURE__ */ ((e) => (e.INVALID_ADDRESS = "INVALID_ADDRESS", e.UNSUPPORTED_ADDRESS_TYPE = "UNSUPPORTED_ADDRESS_TYPE", e.INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS", e.NO_CHANGE_OUTPUT = "NO_CHANGE_OUTPUT", e.MULTIPLE_CHANGE_OUTPUTS = "MULTIPLE_CHANGE_OUTPUTS", e.INVALID_INPUT = "INVALID_INPUT", e.WEBGPU_NOT_AVAILABLE = "WEBGPU_NOT_AVAILABLE", e.WORKER_ERROR = "WORKER_ERROR", e.MINING_ABORTED = "MINING_ABORTED", e.DUST_OUTPUT = "DUST_OUTPUT", e))(S || {});
const A = {};
if (typeof globalThis.__ZELDMINER_WASM_BASE__ > "u")
  try {
    const e = typeof window < "u" && window.location?.origin ? window.location.origin : typeof self < "u" && self.location?.origin ? self.location.origin : "http://localhost";
    globalThis.__ZELDMINER_WASM_BASE__ = new URL("/wasm/", e).href;
  } catch {
    globalThis.__ZELDMINER_WASM_BASE__ = "/wasm/";
  }
let m = null, f = null, w = !1;
const I = () => {
  if (w) return;
  w = !0;
  const e = globalThis.GPUAdapter?.prototype, t = e?.requestDevice;
  !e || typeof t != "function" || (e.requestDevice = function(r) {
    if (r?.requiredLimits && typeof this.limits == "object") {
      const i = r.requiredLimits, o = this.limits;
      for (const s of Object.keys(i))
        (!(s in o) || o[s] === void 0) && delete i[s];
    }
    return t.call(this, r);
  });
}, l = (e) => e.endsWith("/") ? e : `${e}/`, u = (e) => {
  const t = e.trim();
  return t && (typeof window < "u" && typeof window.location?.origin == "string" ? l(new URL(t, window.location.origin).href) : l(new URL(t, import.meta.url).href));
}, N = () => {
  const e = globalThis.__ZELDMINER_WASM_BASE__;
  if (typeof e == "string" && e.trim())
    return u(e);
  const t = A?.VITE_ZELDMINER_WASM_BASE;
  if (typeof t == "string" && t.trim())
    return u(t);
  const n = "./";
  return n.trim() ? u(`${l(n.trim())}wasm/`) : u("/wasm/");
}, E = N(), h = `${E}zeldhash_miner_wasm.js`, b = `${E}zeldhash_miner_wasm_bg.wasm`, T = async (e) => (0, eval)("s => import(s)")(e), g = (e) => e instanceof Error ? e.message : String(e), L = async () => {
  I();
  let e;
  try {
    e = await T(
      /* @vite-ignore */
      h
    );
  } catch (r) {
    throw new Error(
      `Failed to import WASM bundle (${h}). Did you run ./scripts/build-wasm.sh? (${g(r)})`
    );
  }
  const t = e.default;
  if (typeof t != "function")
    throw new Error("WASM init function is missing from the bundle.");
  try {
    const r = new URL(b, import.meta.url);
    await t({ module_or_path: r });
  } catch (r) {
    throw new Error(
      `Failed to initialize WASM bundle: ${g(r)}`
    );
  }
  const n = e;
  try {
    n.init_panic_hook?.();
  } catch {
  }
  return n;
}, D = async () => m || (f || (f = L().then((e) => (m = e, e)).catch((e) => {
  throw f = null, e;
})), f), _ = (1n << 64n) - 1n, U = (e) => {
  if (e < 0n)
    throw new Error("nonce must be non-negative");
  if (e === 0n) return 1;
  let t = 0, n = e;
  for (; n > 0n; )
    t += 1, n >>= 8n;
  return t;
}, d = (e) => {
  if (e < 0n)
    throw new Error("nonce must be non-negative");
  if (e <= 23n) return 1;
  if (e <= 0xffn) return 2;
  if (e <= 0xffffn) return 3;
  if (e <= 0xffffffffn) return 5;
  if (e <= _) return 9;
  throw new Error("nonce range exceeds u64");
}, p = (e) => {
  if (!Number.isInteger(e) || e <= 0 || e > 8)
    throw new Error("nonceLength must be between 1 and 8");
  return (1n << BigInt(e * 8)) - 1n;
}, R = (e) => {
  switch (e) {
    case 1:
      return 23n;
    case 2:
      return 0xffn;
    case 3:
      return 0xffffn;
    case 5:
      return 0xffffffffn;
    case 9:
      return _;
    default:
      throw new Error("cbor nonceLength must be one of 1, 2, 3, 5, 9");
  }
}, B = (e, t) => {
  if (e < 0n)
    throw new Error("startNonce must be non-negative");
  if (!Number.isInteger(t) || t <= 0)
    throw new Error("batchSize must be a positive integer");
  const n = e + BigInt(t - 1);
  if (n > _)
    throw new Error("nonce range exceeds u64");
  const r = [];
  let i = e;
  for (; i <= n; ) {
    const o = U(i), s = p(o), a = n < s ? n : s, c = a - i + 1n;
    if (c > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error("segment size exceeds safe integer range");
    if (r.push({
      start: i,
      size: Number(c),
      nonceLength: o
    }), a === n)
      break;
    i = a + 1n;
  }
  return r;
}, y = (e, t) => {
  if (e < 0n)
    throw new Error("startNonce must be non-negative");
  if (!Number.isInteger(t) || t <= 0)
    throw new Error("batchSize must be a positive integer");
  const n = e + BigInt(t - 1);
  if (n > _)
    throw new Error("nonce range exceeds u64");
  const r = [];
  let i = e;
  for (; i <= n; ) {
    const o = d(i), s = R(o), a = n < s ? n : s, c = a - i + 1n;
    if (c > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error("segment size exceeds safe integer range");
    if (r.push({
      start: i,
      size: Number(c),
      nonceLength: o
    }), a === n)
      break;
    i = a + 1n;
  }
  return r;
};
export {
  S as Z,
  B as a,
  d as c,
  D as l,
  U as n,
  y as s
};