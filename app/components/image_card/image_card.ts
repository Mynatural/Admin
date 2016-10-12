import {Component, Input} from "@angular/core";

import {CachedImage} from "../../providers/aws/s3file";

@Component({
    selector: "fathens-image-card",
    templateUrl: "build/components/image_card/image_card.html"
})
export class ImageCardComponent {

    @Input() target: CachedImage;
    @Input() title: string;
    @Input() showPath: boolean;
}
