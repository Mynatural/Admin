import _ from "lodash";

import { Component, Input, Output, EventEmitter } from "@angular/core";

import Info from "../../providers/model/lineup/_info.d";
import { ItemFlags } from "../../providers/util/flags";
import { Logger } from "../../providers/util/logging";

const logger = new Logger("CategoryComponent");

@Component({
    selector: "fathens-category",
    templateUrl: 'category.html'
})
export class CategoryComponent {
    @Input() category: Info.Category;
    @Input() key: string;
    @Output() keyChange: EventEmitter<string> = new EventEmitter();

    private _flags: ItemFlags;
    get flags(): ItemFlags {
        if (_.isNil(this._flags)) {
            this._flags = new ItemFlags(this.category.flags);
        }
        return this._flags;
    }
}
