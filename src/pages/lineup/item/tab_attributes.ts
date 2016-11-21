import _ from "lodash";

import { Component } from "@angular/core";
import { NavController, NavParams } from "ionic-angular";

import { Item } from "../../../providers/model/lineup/item";
import { EditableMap } from "../../../providers/util/editable_map";
import { Prompt } from "../../../providers/util/prompt";
import { Logger } from "../../../providers/util/logging";

const logger = new Logger("ItemTabAttributes");

@Component({
    selector: "item-tab_attributes",
    templateUrl: 'tab_attributes.html'
})
export class ItemTabAttributes {
    readonly item: Item;

    constructor(private nav: NavController, private prompt: Prompt, params: NavParams) {
        this.item = params.get("item");
    }

    get title(): string {
        return this.item.name;
    }

    get path(): string[] {
        return [
            `Item: ${this.item.name}`
        ];
    }

    keyError: string;

    get key(): string {
        return this.item.key;
    }

    set key(v: string) {
        try {
            this.item.key = v;
            this.keyError = null;
        } catch (ex) {
            logger.debug(() => `Failed to update key: ${ex}`);
            this.keyError = `${ex}`;
        }
    }

    private _flags: EditableMap<string>;
    get flags(): EditableMap<string> {
        if (_.isNil(this._flags)) {
            this._flags = new EditableMap<string>(this.item.flags, () => "new_value");
        }
        return this._flags;
    }

    async write(): Promise<void> {
        this.item.flags = this.flags.toObject();
        await this.item.writeInfo();
    }

    async delete(): Promise<void> {
        if (await this.prompt.confirm(`"${this.title}"を削除します`)) {
            await this.item.itemGroup.remove(this.item);
            this.nav.pop();
        }
    }
}
