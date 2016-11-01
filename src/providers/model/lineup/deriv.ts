import * as Json from "./_info.d";
import { LineupController } from "./lineup";
import { Spec } from "./spec";
import { CachedImage } from "../../aws/s3file";
import { InputInterval } from "../../util/input_interval";
import { Logger } from "../../util/logging";

const logger = new Logger("Lineup.Deriv");

export class DerivGroup {
    static async byJSONs(ctrl: LineupController, spec: Spec, jsons: Json.DerivGroup[]): Promise<DerivGroup[]> {
        return _.filter(await Promise.all(_.map(jsons, async (json) => {
            const result = new DerivGroup(ctrl, spec, json.key, json.name, []);

            result.availables = _.filter(await Promise.all(_.map(json.value.availables, (a) =>
                Deriv.byJSON(ctrl, result, a)
            )));
            logger.debug(() => `Building DerivGroup: ${_.size(result.availables)}`);

            return _.isEmpty(result.availables) ? null : result;
        })));
    }

    private _current: Deriv;
    private _changeKey: InputInterval<string> = new InputInterval<string>(1000);

    constructor(private ctrl: LineupController,
            public spec: Spec,
            private _key: string,
            public name: string,
            public availables: Deriv[]
    ) { }

    get asJSON() {
        return {
            key: this.key,
            name: this.name,
            value: {
                availables: _.map(this.availables, (o) => o.asJSON)
            }
        };
    }

    get key(): string {
        return this._key;
    }

    set key(v: string) {
        this.ctrl.checkKey(v);
        if (!_.isEqual(this.key, v) && !_.isNil(this.spec.getDeriv(v))) throw "Exist key";

        this._changeKey.update(v, async (v) => {
            await this.ctrl.onChanging.derivGroupKey(this, async () => {
                this._key = v;
            });
        });
    }

    get current(): Deriv {
        if (_.isNil(this._current)) {
            this._current = _.head(this.availables);
        }
        return this._current;
    }

    set current(v: Deriv) {
        if (_.find(this.availables, {key: v.key}) && !_.isEqual(this.current.key, v.key)) {
            this._current = v;
            this.spec.onChangedDerivCurrent();
        }
    }

    get(key: string): Deriv {
        return _.find(this.availables, {key: key});
    }

    async remove(o: Deriv): Promise<void> {
        if (_.size(this.availables) < 2) return;
        await this.ctrl.onRemoving.deriv(o, async () => {
            _.remove(this.availables, {key: o.key});
            this._current = null;
        });
    }

    async createNew(): Promise<Deriv> {
        const key = await this.ctrl.createNewKey("new_deriv_value", async (key) => this.get(key));
        const one = new Deriv(this.ctrl, this, key, "新しい派生の値", "");
        this.availables.unshift(one);
        return one;
    }
}

export class Deriv {
    static async byJSON(ctrl: LineupController, dg: DerivGroup, json: Json.Deriv): Promise<Deriv> {
        return new Deriv(ctrl, dg, json.key, json.name, json.description);
    }

    private _image: CachedImage;
    private _changeKey: InputInterval<string> = new InputInterval<string>(1000);

    constructor(private ctrl: LineupController,
            public derivGroup: DerivGroup,
            private _key: string,
            public name: string,
            public description: string
    ) { }

    get asJSON() {
        return {
            key: this.key,
            name: this.name,
            description: this.description
        };
    }

    get key(): string {
        return this._key;
    }

    set key(v: string) {
        this.ctrl.checkKey(v);
        if (!_.isEqual(this.key, v) && !_.isNil(this.derivGroup.get(v))) throw "Exist key";

        this._changeKey.update(v, async (v) => {
            await this.ctrl.onChanging.derivKey(this, async () => {
                this._key = v;
            });
        });
    }

    refreshIllustrations() {
        this.refreshImage(true);
    }

    private refreshImage(clear = false): CachedImage {
        if (clear || _.isNil(this._image)) {
            this._image = this.ctrl.illust.deriv(this);
        }
        return this._image;
    }

    async changeImage(file: File): Promise<void> {
        await this.ctrl.illust.uploadDeriv(this, file);
        this.refreshImage(true);
    }

    get image(): CachedImage {
        return this.refreshImage();
    }
}
