import {Component, Input} from "@angular/core";

import {CachedImage} from "../../providers/aws/s3file";

@Component({
    selector: "fathens-image-card",
    templateUrl: "image_card.html"
})
export class ImageCardComponent {

    @Input() target: CachedImage;
    @Input() title: string;
    @Input() showPath: boolean;

    get imagePath(): string {
        if (!this.target) return null;
        const path = _.head(this.target.listPath);
        return _.join(_.tail(_.split(path, "/")), ", ");
    }
}
