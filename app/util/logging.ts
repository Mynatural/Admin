
function padLeft(v: string, d: number, c?: string): string {
    if (v.length > d) return v;
    if (!c) c = " ";
    return `${c.repeat(d)}${v}`.slice(-d);
}

function dateString(now?: Date): string {
    if (!now) now = new Date();
    const pad = (d: number) => (v: number) => padLeft(v.toString(), d, "0");
    const date = [
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    ].map(pad(2)).join("-");
    const time = [
        now.getHours(),
        now.getMinutes(),
        now.getSeconds()
    ].map(pad(2)).join(":");
    return `${date} ${time}.${pad(3)(now.getMilliseconds())}`;
}

export type Lebel = "DEBUG" | "INFO" | "WARN" | "FATAL";

const lebels: Array<Lebel> = ["DEBUG", "INFO", "WARN", "FATAL"];

let isDEVEL: boolean = true;

function output(text: string) {
    console.log(text);
}

export class Logger {
    static lebel: Lebel = lebels[0];
    static async setLebelByVersionNumber() {
        this.lebel = isDEVEL ? "DEBUG" : "INFO";
        output(`Set log lebel: ${this.lebel}`);
    }

    constructor(private tag: string) {
        this.lebel = Logger.lebel;
    }

    private _lebel: Lebel;
    get lebel() {
        return this._lebel;
    }
    set lebel(v: Lebel) {
        this._lebel = v;
        this._limit = null;
    }

    private _limit: number;
    private get limit() {
        if (!this._limit) this._limit = _.findIndex(lebels, (x) => x === this.lebel);
        return this._limit;
    }

    private checkLebel(l: Lebel): boolean {
        const n = _.findIndex(lebels, (x) => x === l);
        return this.limit <= n;
    }

    private output(lebel: Lebel, msg: () => string) {
        if (this.checkLebel(lebel)) {
            output(`${dateString()}: ${padLeft(lebel, 5)}: ${this.tag}: ${msg()}`);
        }
    }

    public debug(msg: () => string) {
        this.output("DEBUG", msg);
    }

    public info(msg: () => string) {
        this.output("INFO", msg);
    }

    public warn(msg: () => string) {
        this.output("WARN", msg);
    }

    public fatal(msg: () => string) {
        this.output("FATAL", msg);
    }
}
