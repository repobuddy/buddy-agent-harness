/**
 * Why a byte-preserving edit was not made:
 * - `absent`: nothing at the path to replace.
 * - `comment`: the text being replaced holds a comment the replacement would drop.
 * - `shape`: the value is written in a form the editor does not replace in place, such as a TOML
 *   inline table or dotted keys.
 * - `unreadable`: the source does not parse.
 */
export type ConfigEditRefusal = 'absent' | 'comment' | 'shape' | 'unreadable'

export type ConfigEdit = { kind: 'edited'; text: string } | { kind: 'refused'; reason: ConfigEditRefusal }
