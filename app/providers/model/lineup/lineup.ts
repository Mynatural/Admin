import {Injectable} from "@angular/core";

import * as Info from "./_info.d";
import {ItemGroup, Item} from "./item";
import {SpecGroup, Spec} from "./spec";
import {DerivGroup, Deriv} from "./deriv";
import {Measure} from "./measure";

import {S3File, S3Image, CachedImage} from "../../aws/s3file";
import * as Base64 from "../../../util/base64";
import {Logger} from "../../../util/logging";

const logger = new Logger("Lineup");

@Injectable()
export class LineupController {
    onChanging: OnChanging;
    onRemoving: OnRemoving;
    illust: Illustration;
    itemGroup: Promise<ItemGroup>;

    constructor(private s3image: S3Image) {
        this.onChanging = new OnChanging(s3image.s3);
        this.onRemoving = new OnRemoving(s3image.s3);
        this.illust = new Illustration(s3image);
        this.itemGroup = this.getAll().then((list) => {
            return new ItemGroup(this, list);
        });
    }

    async createNewKey(prefix: string, find: (v: string) => Promise<any>): Promise<string> {
        var index = 0;
        var key;
        while (_.isNil(key) || !_.isNil(await find(key))) {
            key = `${prefix}_${index++}`;
        }
        return key;
    }

    private async getAll(): Promise<Item[]> {
        const rootDir = Path.itemDir("");
        const finds = await this.s3image.s3.list(rootDir);
        logger.debug(() => `Finds: ${JSON.stringify(finds, null, 4)}`);
        const keys = _.filter(finds.map((path) => {
            if (path.endsWith(`/${INFO_JSON}`)) {
                const l = _.split(path, "/");
                return l[l.length - 2];
            }
            return null;
        }));
        logger.debug(() => `Keys: ${JSON.stringify(keys, null, 4)}`);
        const list = keys.map(async (key) => {
            try {
                return await this.load(key);
            } catch (ex) {
                logger.warn(() => `Failed to load '${key}': ${ex}`);
                return null;
            }
        });
        return _.filter(await Promise.all(list));
    }

    private async load(key: string): Promise<Item> {
        const text = await this.s3image.s3.read(Path.infoItem(key));
        const info = Base64.decodeJson(text) as Info.Item;
        return await Item.byJSON(this, key, info);
    }

    async write(key: string, json: Info.Item): Promise<void> {
        const path = Path.infoItem(key)
        await this.s3image.s3.write(path, Base64.encodeJson(json));
    }

    async loadSpec(key: string): Promise<Info.Spec> {
        const text = await this.s3image.s3.read(Path.infoSpec(key));
        return Base64.decodeJson(text) as Info.Spec;
    }
}

const ROOT = "unauthorized";
const LINEUP = "lineup";
const SPEC = "_spec";
const INFO_JSON = "info.json.encoded";

const SIDES: Info.SpecSide[] = ["FRONT", "BACK"];

class Path {
    private static join(...list): string {
        return _.join(_.flattenDeep(list), "/");
    }

    static itemDir(key: string): string {
        return Path.join(ROOT, LINEUP, key);
    }

    static dirItem(o: Item): string {
        return Path.itemDir(o.key);
    }

    static dirSpec(spec: Spec): string {
        const list = [spec.isGlobal ? ROOT : Path.dirItem(spec.specGroup.item)];
        list.push(SPEC);
        if (!spec.isGlobal) list.push(spec.specGroup.key);
        list.push(spec.key);
        return Path.join(list);
    }

    static infoItem(key: string): string {
        return Path.join(Path.itemDir(key), INFO_JSON);
    }

    static infoSpec(key: string): string {
        return Path.join(ROOT, SPEC, key, INFO_JSON);
    }

    static imagesItemTitle(o: Item): string[] {
        return [Path.join(Path.dirItem(o), "title.png")];
    }

    static imagesItem(o: Item, side: Info.SpecSide): string[] {
        const names = _.map(o.specGroups, (specGroup) => {
            const spec = specGroup.current;
            const keys = _.map(spec.derivGroups, (v) => v.current.key);
            keys.unshift(spec.key);
            return keys;
        });
        return [Path.makeImageItem(o, side, names)];
    }

    static imagesDeriv(o: Deriv): string[] {
        const spec = o.derivGroup.spec;
        return Path.illustrations(Path.dirSpec(spec), "derives", o.derivGroup.key, o.key);
    }

    static imagesSpec(spec: Spec): string[] {
        const keys = _.map(spec.derivGroups, (v) => v.current.key);
        return Path.illustrations(Path.dirSpec(spec), "images", keys);
    }

    static imagesMeasure(o: Measure): string[] {
        return Path.illustrations(Path.dirItem(o.item), "measurements", o.key);
    }

    private static illustrations(...paths): string[] {
        return _.map(["svg", "png"], (sux) => Path.join(paths, `illustration.${sux}`));
    }

    private static makeImageItem(o: Item, side: Info.SpecSide, keys): string {
        return Path.join(Path.dirItem(o), "images", keys, `${side}.png`);
    }

    private static makeImagesSpec(o: Spec, keys: string[]): string[] {
        return Path.illustrations(Path.dirSpec(o), "images", keys);
    }

    static allImagesItem(o: Item): string[] {
        return _.flatMap(Path.allKeysItem(o), (keys) =>
            _.map(SIDES, (side) => Path.makeImageItem(o, side, keys))
        );
    }

    static allImagesSpec(o: Spec): string[] {
        return _.flatMap(Path.allKeysSpec(o), (keys) =>
            Path.makeImagesSpec(o, keys)
        );
    }

    static allKeysItem(o: Item): string[][] {
        const lists = _.map(o.specGroups, (specGroup) =>
            _.map(specGroup.availables, (spec) =>
                _.map(Path.allKeysSpec(spec), (b) =>
                    _.flatten([spec.key, b])
                )
            )
        );
        return combinations(lists);
    }

    static allKeysSpec(spec: Spec): string[][] {
        const lists = _.map(spec.derivGroups, (derivGroup) =>
            _.map(derivGroup.availables, (deriv) => deriv.key)
        );
        return combinations(lists);
    }
}

function combinations(lists: any[][]): any[][] {
    const list = _.head(lists);
    const lefts = _.tail(lists);
    if (_.isEmpty(lefts)) {
        return _.map(list, (a) => [a]);
    } else {
        return _.flatMap(list, (a) =>
            _.map(combinations(lefts), (b) =>
                _.flattenDeep([a, b])
            )
        );
    }
}

class Illustration {
    constructor(private s3image: S3Image) { }

    private async upload(pathList: string[], file: File): Promise<void> {
        const sux = file.name.replace(/.*\./, "");
        const path = _.find(pathList, (path) => _.endsWith(path, `.${sux}`));
        if (_.isNil(path)) {
            throw `Illegal file type: ${sux}`;
        }
        await this.s3image.s3.upload(path, file);
    }

    itemTitle(o: Item): CachedImage {
        return this.s3image.createCache(Path.imagesItemTitle(o));
    }

    async uploadItemTitle(o: Item, file: File): Promise<void> {
        await this.upload(Path.imagesItemTitle(o), file);
    }

    // SpecSide -> CachedImage
    itemCurrent(o: Item): {[key: string]: CachedImage} {
        return _.fromPairs(_.map(SIDES, (side) =>
            [side, this.s3image.createCache(Path.imagesItem(o, side))]
        ));
    }

    async uploadItemCurrent(o: Item, side: Info.SpecSide, file: File): Promise<void> {
        await this.upload(Path.imagesItem(o, side), file);
    }

    specCurrent(o: Spec): CachedImage {
        return this.s3image.createCache(Path.imagesSpec(o));
    }

    async uploadSpecCurrent(o: Spec, file: File): Promise<void> {
        await this.upload(Path.imagesSpec(o), file);
    }

    deriv(o: Deriv): CachedImage {
        return this.s3image.createCache(Path.imagesDeriv(o));
    }

    async uploadDeriv(o: Deriv, file: File): Promise<void> {
        await this.upload(Path.imagesDeriv(o), file);
    }

    measure(o: Measure): CachedImage {
        return this.s3image.createCache(Path.imagesMeasure(o));
    }

    async uploadMeasure(o: Measure, file: File): Promise<void> {
        await this.upload(Path.imagesMeasure(o), file);
    }
}

type DoThru = () => Promise<void>;

async function refresh(item: Item): Promise<void> {
    await item.writeInfo();

    item.refreshIllustrations();
    item.measurements.forEach((m) => m.refreshIllustrations());
    (await item.specGroups).forEach((spec) => {
        spec.availables.forEach((spec) => {
            spec.refreshIllustrations();
            spec.derivGroups.forEach((derivGroup) => {
                derivGroup.availables.forEach((deriv) => {
                    deriv.refreshIllustrations();
                });
            });
        });
    });
}

class OnChanging {
    constructor(private s3: S3File) { }

    private async moveFile(src, dst): Promise<void> {
        if (!_.isEqual(src, dst) && await this.s3.exists(src)) {
            await this.s3.move(src, dst);
        }
    }

    private async moveDir(src, dst): Promise<void> {
        if (!_.isEqual(src, dst) && await this.s3.exists(src)) {
            await this.s3.moveDir(src, dst);
        }
    }

    private async moveFiles(srcList, dstList): Promise<void> {
        logger.debug(() => `Moving files: ${JSON.stringify(srcList, null, 4)}`);
        await Promise.all(_.map(_.zip(srcList, dstList),
            (pair) => this.moveFile(pair[0], pair[1])
        ));
    }

    private async moveDirs(srcList, dstList): Promise<void> {
        await Promise.all(_.map(_.zip(srcList, dstList),
            (pair) => this.moveDir(pair[0], pair[1])
        ));
    }

    async itemKey(o: Item, go: DoThru) {
        const src = Path.dirItem(o);
        await go();
        const dst = Path.dirItem(o);

        await this.moveDir(src, dst);
        await refresh(o);
    }

    async specGroupKey(o: SpecGroup, go: DoThru) {
        const srcList = _.map(o.availables, (v) => Path.dirSpec(v));
        await go();
        const dstList = _.map(o.availables, (v) => Path.dirSpec(v));

        await this.moveDirs(srcList, dstList);
        await refresh(o.item);
    }

    async specKey(o: Spec, go: DoThru) {
        const srcList = Path.allImagesItem(o.specGroup.item);
        const srcDir = Path.dirSpec(o);

        await go();

        const dstList = Path.allImagesItem(o.specGroup.item);
        const dstDir = Path.dirSpec(o);

        await Promise.all([
            this.moveFiles(srcList, dstList),
            this.moveDir(srcDir, dstDir)
        ]);
        await refresh(o.specGroup.item);
    }

    async specGlobal(o: Spec, go: DoThru) {
        const srcDir = Path.dirSpec(o);
        await go();
        const dstDir = Path.dirSpec(o);

        await this.moveDir(srcDir, dstDir);
        await refresh(o.specGroup.item);
    }

    async derivGroupKey(o: DerivGroup, go: DoThru) {
        const srcList = _.flatMap(o.availables, (v) => Path.imagesDeriv(v));
        await go();
        const dstList = _.flatMap(o.availables, (v) => Path.imagesDeriv(v));

        await this.moveFiles(srcList, dstList);
        await refresh(o.spec.specGroup.item);
    }

    async derivKey(o: Deriv, go: DoThru) {
        const srcList = _.flatten([
            Path.allImagesItem(o.derivGroup.spec.specGroup.item),
            Path.allImagesSpec(o.derivGroup.spec),
            Path.imagesDeriv(o)
        ]);

        await go();

        const dstList = _.flatten([
            Path.allImagesItem(o.derivGroup.spec.specGroup.item),
            Path.allImagesSpec(o.derivGroup.spec),
            Path.imagesDeriv(o)
        ]);

        await this.moveFiles(srcList, dstList);
        await refresh(o.derivGroup.spec.specGroup.item);
    }

    async measureKey(o: Measure, go: DoThru) {
        const srcList = Path.imagesMeasure(o);
        await go();
        const dstList = Path.imagesMeasure(o);

        await this.moveFiles(srcList, dstList);
        await o.refreshIllustrations();
    }
}

class OnRemoving {
    constructor(private s3: S3File) { }

    async itemValue(o: Item, go: DoThru) {
        await go();
        await this.s3.removeDir(Path.dirItem(o));
    }

    async specGroup(o: SpecGroup, go: DoThru) {
        await go();

        await refresh(o.item);
    }

    async spec(o: Spec, go: DoThru) {
        await go();

        await refresh(o.specGroup.item);
    }

    async derivGroup(o: DerivGroup, go: DoThru) {
        await go();

        await refresh(o.spec.specGroup.item);
    }

    async deriv(o: Deriv, go: DoThru) {
        await go();

        await refresh(o.derivGroup.spec.specGroup.item);
    }

    async measure(o: Measure, go: DoThru) {
        await go();

        await refresh(o.item);
    }
}
