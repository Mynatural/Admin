import {Injectable} from "@angular/core";
import {SafeUrl} from '@angular/platform-browser';

import * as Json from "./_info.d";
import {LineupController} from "./lineup";
import {SpecGroup, Spec} from "./spec";
import {Measure} from "./measure";
import {S3Image, CachedImage} from "../../aws/s3file";
import {InputInterval} from "../../../util/input_interval";
import * as Base64 from "../../../util/base64";
import {Logger} from "../../../util/logging";

const logger = new Logger("Lineup.Item");

export class ItemGroup {
    constructor(private ctrl: LineupController, public availables: Item[]) { }

    get(key: string): Item {
        return _.find(this.availables, {"key": key});
    }

    async remove(o: Item): Promise<void> {
        await this.ctrl.onRemoving.itemValue(o, async () => {
            _.remove(this.availables, (a) => _.isEqual(a.key, o.key));
        })
    }

    async createNew(): Promise<Item> {
        const key = await this.ctrl.createNewKey("new_created", async (key) => _.find(this.availables, {key: key}));
        const one = new Item(this.ctrl, key, "新しいラインナップ", "", 500, [], []);
        this.availables.unshift(one);
        return one;
    }
}

export class Item {
    static async byJSON(ctrl: LineupController, key: string, json: Json.Item): Promise<Item> {
        logger.info(() => `${key}: ${JSON.stringify(json, null, 4)}`);
        const result = new Item(ctrl, key, json.name, json.description, json.price, [], []);

        result.specGroups = await SpecGroup.byJSONs(ctrl, result, json.specGroups, json.specs);
        result.measurements = await Promise.all(_.map(json.measurements, (j) => Measure.byJSON(ctrl, result, j)));

        return result;
    }

    private _titleImage: CachedImage;
    private _images: {[key: string]: CachedImage}; // SpecSide -> CachedImage
    private _changeKey: InputInterval<string> = new InputInterval<string>(1000);

    constructor(private ctrl: LineupController,
            private _key: string,
            public name: string,
            public description: string,
            public price: number,
            public specGroups: SpecGroup[],
            public measurements: Measure[]
    ) { }

    get asJSON() {
        const localSpecs = _.uniqBy(_.filter(_.flatMap(this.specGroups,
            (sg) => sg.availables), (s) => !s.isGlobal), "key"
        );
        return {
            key: this.key,
            name: this.name,
            price: this.price,
            description: this.description,
            specGroups: _.map(this.specGroups, (o) => o.asJSON),
            specs: _.map(localSpecs, (o) => o.asJSON),
            measurements: _.map(this.measurements, (o) => o.asJSON)
        };
    }

    async writeInfo(): Promise<void> {
        await this.ctrl.write(this.key, this.asJSON);
    }

    get key(): string {
        return this._key;
    }

    set key(v: string) {
        if (_.isEmpty(v)) return;
        this._changeKey.update(v, async (v) => {
            await this.ctrl.onChanging.itemKey(this, async () => {
                this._key = v;
            });
        });
    }

    refreshIllustrations() {
        this.refreshTiteImage(true);
        this.refreshCurrentImages(true);
    }

    onChangedSpecCurrent() {
        this.refreshCurrentImages(true);
    }

    private refreshTiteImage(clear = false): CachedImage {
        if (clear || _.isNil(this._titleImage)) {
            this._titleImage = this.ctrl.illust.itemTitle(this);
        }
        return this._titleImage;
    }

    get titleImage(): SafeUrl {
        return this.refreshTiteImage().url;
    }

    get titleImagePath(): string[] {
        return this.refreshTiteImage().listPath;
    }

    async changeTitleImage(file: File): Promise<void> {
        await this.ctrl.illust.uploadItemTitle(this, file);
        this.refreshTiteImage(true);
    }

    private refreshCurrentImages(clear = false): {[key: string]: CachedImage} {
        if (clear || _.isEmpty(this._images)) {
            this._images = this.ctrl.illust.itemCurrent(this);
        }
        return this._images;
    }

    getImage(side: Json.SpecSide): SafeUrl {
        const safe = this.refreshCurrentImages()[side];
        return safe ? safe.url : null;
    }

    getImagePath(side: Json.SpecSide): string[] {
        const safe = this.refreshCurrentImages()[side];
        return safe ? safe.listPath : null;
    }

    async changeImage(side: Json.SpecSide, file: File): Promise<void> {
        await this.ctrl.illust.uploadItemCurrent(this, side, file);
        this.refreshCurrentImages(true);
    }

    get totalPrice(): number {
        var result = this.price;
        _.forEach(this.specGroups, (spec, key) => {
            const v = spec.current;
            if (v) {
                result = result + v.price;
            }
        });
        return result;
    }

    getSpec(key: string): SpecGroup {
        return _.find(this.specGroups, {key: key});
    }

    async removeSpec(o: SpecGroup): Promise<void> {
        await this.ctrl.onRemoving.specGroup(o, async () => {
            _.remove(this.specGroups, {key: o.key});
        });
    }

    async createSpec(): Promise<SpecGroup> {
        const key = await this.ctrl.createNewKey("new_spec", async (key) => this.getSpec(key));
        const one = new SpecGroup(this.ctrl, this,
            key, "新しい仕様", "FRONT", null, []);
        await one.createNew();
        this.specGroups.unshift(one);
        return one;
    }

    async getMeasure(key: string): Promise<Measure> {
        return _.find(this.measurements, {key: key});
    }

    async removeMeasure(o: Measure): Promise<void> {
        await this.ctrl.onRemoving.measure(o, async () => {
            _.remove(this.measurements, {key: o.key});
        });
    }

    async createMeasure(): Promise<Measure> {
        const key = await this.ctrl.createNewKey("new_measure", async (key) => this.getMeasure(key));
        const one = new Measure(this.ctrl, this, key, "新しい寸法", "", 10, 10, 100, 1);
        this.measurements.unshift(one);
        return one;
    }
}
