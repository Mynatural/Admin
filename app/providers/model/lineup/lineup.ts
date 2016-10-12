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

    constructor(private s3image: S3Image) {
        this.onChanging = new OnChanging(s3image.s3);
        this.onRemoving = new OnRemoving(s3image.s3);
        this.illust = new Illustration(s3image);
    }

    async createNewKey(prefix: string, find: (v: string) => Promise<any>): Promise<string> {
        let index = 0;
        let key;
        while (_.isNil(key) || !_.isNil(await find(key))) {
            key = `${prefix}_${index++}`;
        }
        return key;
    }

    async findItems(): Promise<string[]> {
        const rootDir = Path.itemDir("");
        const finds = await this.s3image.s3.list(rootDir);
        logger.debug(() => `Finds: ${JSON.stringify(finds, null, 4)}`);
        return _.filter(finds.map((path) => {
            if (path.endsWith(`/${INFO_JSON}`)) {
                const l = _.split(path, "/");
                return l[l.length - 2];
            }
            return null;
        }));
    }

    async loadItem(key: string): Promise<Info.Item> {
        const text = await this.s3image.s3.read(Path.infoItem(key));
        return Base64.decodeJson(text) as Info.Item;
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
const SPEC_KEY_PREFIX = "spec#";
const IMAGES = "images";
const INFO_JSON = "info.json.encoded";

const SIDES: Info.SpecSide[] = ["FRONT", "BACK"];

class Path {
    private static join(...list): string {
        return _.join(_.filter(_.flattenDeep(list)), "/");
    }

    static itemDir(key: string): string {
        return Path.join(ROOT, LINEUP, key);
    }

    static dirItem(o: Item, ...keys): string {
        return Path.join(Path.itemDir(o.key), keys);
    }

    static dirSpec(spec: Spec, ...keys): string {
        const base = spec.isGlobal ? ROOT : Path.dirItem(spec.specGroup.item);
        const group = spec.isGlobal ? null : spec.specGroup.key;
        return Path.join(base, SPEC, group, spec.key, keys);
    }

    static infoItem(key: string): string {
        return Path.join(Path.itemDir(key), INFO_JSON);
    }

    static infoSpec(key: string): string {
        return Path.join(ROOT, SPEC, key, INFO_JSON);
    }

    static imagesItemTitle(o: Item): string[] {
        return [Path.dirItem(o, "title.png")];
    }

    static imagesItem(o: Item, side: Info.SpecSide): string[] {
        const names = _.map(o.specGroups, (specGroup) => {
            const spec = specGroup.current;
            const keys = _.map(spec.derivGroups, (v) => v.current.key);
            return [Path.keyOfSpecImageItem(spec), keys];
        });
        return [Path.makeImageItem(o, side, names)];
    }

    static imagesDeriv(o: Deriv): string[] {
        const spec = o.derivGroup.spec;
        return Path.illustrations(Path.dirSpec(spec, "derives", o.derivGroup.key, o.key));
    }

    static imagesSpec(o: Spec): string[] {
        return Path.makeImagesSpec(o, _.map(o.derivGroups, (v) => v.current.key));
    }

    static imagesMeasure(o: Measure): string[] {
        return Path.illustrations(Path.dirItem(o.item, "measurements", o.key));
    }

    private static illustrations(...paths): string[] {
        return _.map(["svg", "png"], (sux) => Path.join(paths, `illustration.${sux}`));
    }

    private static makeImageItem(o: Item, side: Info.SpecSide, keys): string {
        return Path.dirItem(o, IMAGES, keys, `${side}.png`);
    }

    private static makeImagesSpec(o: Spec, keys: string[]): string[] {
        return Path.illustrations(Path.dirSpec(o, IMAGES, keys));
    }

    static keyOfSpecImageItem(spec: Spec): string {
        return `${SPEC_KEY_PREFIX}${spec.key}`
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
            _.flatMap(specGroup.availables, (spec) =>
                _.map(Path.allKeysSpec(spec), (b) =>
                    _.flatten([Path.keyOfSpecImageItem(spec), b])
                )
            )
        );
        return combinations(lists);
    }

    static allKeysSpec(spec: Spec): string[][] {
        const lists = _.map(spec.derivGroups, (derivGroup) =>
            _.map(derivGroup.availables, (deriv) => deriv.key)
        );
        return _.isEmpty(lists) ? [[]] : combinations(lists);
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

    private async moveFiles(srcList: string[], dstList: string[]): Promise<void> {
        logger.debug(() => `Moving files: ${JSON.stringify(srcList, null, 4)}`);
        await Promise.all(_.map(_.zip(srcList, dstList),
            async (pair) => {
                const src = pair[0];
                const dst = pair[1];
                if (!_.isEqual(src, dst) && await this.s3.exists(src)) {
                    await this.s3.move(src, dst);
                }
            }
        ));
    }

    private async moveDirs(srcList: string[], dstList: string[]): Promise<void> {
        logger.debug(() => `Moving dirs: ${JSON.stringify(srcList, null, 4)}`);
        await Promise.all(_.map(_.zip(srcList, dstList),
            async (pair) => {
                const src = pair[0];
                const dst = pair[1];
                if (!_.isEqual(src, dst)) {
                    await this.s3.moveDir(src, dst);
                }
            }
        ));
    }

    async itemKey(o: Item, go: DoThru) {
        const src = Path.dirItem(o);
        await go();
        const dst = Path.dirItem(o);

        await this.moveDirs([src], [dst]);
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
            this.moveDirs([srcDir], [dstDir])
        ]);
        await refresh(o.specGroup.item);
    }

    async specGlobal(o: Spec, go: DoThru) {
        const srcDir = Path.dirSpec(o);
        await go();
        const dstDir = Path.dirSpec(o);

        await this.moveDirs([srcDir], [dstDir]);
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
        const listup = () => _.flatten([
            Path.allImagesItem(o.derivGroup.spec.specGroup.item),
            Path.allImagesSpec(o.derivGroup.spec),
            Path.imagesDeriv(o)
        ]);

        const srcList = listup();
        await go();
        const dstList = listup();

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

    async removeFiles(list: string[]): Promise<void> {
        logger.debug(() => `Removing files: ${JSON.stringify(list, null, 4)}`);
        await Promise.all(_.map(list, (file) => this.s3.remove(file)));
    }

    async removeDirs(list: string[]): Promise<void> {
        logger.debug(() => `Removing dirs: ${JSON.stringify(list, null, 4)}`);
        await Promise.all(_.map(list, (dir) => this.s3.removeDir(dir)));
    }

    private filesOfSpec(spec: Spec): string[] {
        const item = spec.specGroup.item;
        const key = Path.keyOfSpecImageItem(spec);
        const base = Path.dirItem(item, IMAGES);
        return _.filter(Path.allImagesItem(item), (path) => {
            const names = _.filter(_.split(path.substr(base.length), "/"));
            return _.some(names, (name) => _.isEqual(name, key));
        });
    }

    private filesOfDeriv(deriv: Deriv): string[] {
        const spec = deriv.derivGroup.spec;
        const item = spec.specGroup.item;
        const index = _.findIndex(spec.derivGroups, (dg) => _.isEqual(dg.key, deriv.derivGroup.key));

        const specKey = Path.keyOfSpecImageItem(spec);
        const itemBase = Path.dirItem(item, IMAGES);
        const itemImages = _.filter(Path.allImagesItem(item), (path) => {
            const names = _.filter(_.split(path.substr(itemBase.length), "/"));
            const parts = _.takeWhile(_.tail(_.dropWhile(names,
                (name) => !_.isEqual(name, specKey))),
                (name) => !name.startsWith(SPEC_KEY_PREFIX)
            );
            return _.isEqual(parts[index], deriv.key);
        });

        const specBase = Path.dirSpec(spec, IMAGES);
        const specImages = _.filter(Path.allImagesSpec(spec), (path) => {
            const names = _.filter(_.split(path.substr(specBase.length), "/"));
            return _.isEqual(names[index], deriv.key);
        });

        return itemImages.concat(specImages).concat(Path.imagesDeriv(deriv));
    }

    async itemValue(o: Item, go: DoThru) {
        await go();
        await this.s3.removeDir(Path.dirItem(o));
    }

    async specGroup(o: SpecGroup, go: DoThru) {
        const files = _.flatMap(o.availables, (spec) => this.filesOfSpec(spec));
        const dirs = _.map(_.filter(o.availables, {isGlobal: false}),
            (spec) => Path.dirSpec(spec)
        );
        await go();

        await Promise.all([this.removeDirs(dirs), this.removeFiles(files)]);
        await refresh(o.item);
    }

    async spec(o: Spec, go: DoThru) {
        const files = this.filesOfSpec(o);
        const dir = Path.dirSpec(o);
        await go();

        await Promise.all([this.s3.removeDir(dir), this.removeFiles(files)]);
        await refresh(o.specGroup.item);
    }

    async derivGroup(o: DerivGroup, go: DoThru) {
        const files = _.flatMap(o.availables, (d) => this.filesOfDeriv(d));
        await go();

        await this.removeFiles(files);
        await refresh(o.spec.specGroup.item);
    }

    async deriv(o: Deriv, go: DoThru) {
        const files = this.filesOfDeriv(o);
        await go();

        await this.removeFiles(files);
        await refresh(o.derivGroup.spec.specGroup.item);
    }

    async measure(o: Measure, go: DoThru) {
        const files = Path.imagesMeasure(o);
        await go();

        await this.removeFiles(files);
        await refresh(o.item);
    }
}
