
export const ROOT = "unauthorized";
export const LINEUP = "lineup";
export const SPEC_VALUE = "spec-value";
export const INFO_JSON = "info.json.encoded";

export function createNewKey(prefix: string, find: (v: string) => any): string {
    var index = 0;
    var key;
    while (_.isNil(key) || !_.isNil(find(key))) {
        key = `${prefix}_${index++}`;
    }
    return key;
}
