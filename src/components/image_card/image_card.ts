import _ from "lodash";
import { Component, Input } from "@angular/core";

import { CachedImage } from "../../providers/aws/s3file";

@Component({
    selector: "fathens-image-card",
    templateUrl: "image_card.html"
})
export class ImageCardComponent {
    @Input() target: CachedImage;

    get isLoading(): boolean {
        return !this.target || this.target.isLoading;
    }

    get imagePath(): string {
        if (!this.target) return null;
        return _.join(this.target.listPath, ", ");
    }
}
