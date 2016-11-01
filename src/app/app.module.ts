import { NgModule } from "@angular/core";
import { Storage } from "@ionic/storage";
import { IonicApp, IonicModule } from "ionic-angular";
import { CustomIconsModule } from "ionic2-custom-icons";

import { MyApp } from "./app.component";

import { HomePage } from "../pages/home/home";
import { ItemGroupPage } from "../pages/lineup/item_group";
import { ItemPage } from "../pages/lineup/item";
import { SpecGroupPage } from "../pages/lineup/spec_group";
import { SpecPage } from "../pages/lineup/spec";
import { DerivGroupPage } from "../pages/lineup/deriv_group";
import { DerivPage } from "../pages/lineup/deriv";
import { MeasurePage } from "../pages/lineup/measure";

import { ImageCardComponent } from "../components/image_card/image_card";

import { BootSettings } from "../providers/config/boot_settings";
import { Configuration } from "../providers/config/configuration";
import { Credentials } from "../providers/config/credentials";
import { Preferences } from "../providers/config/preferences";
import { S3File, S3Image } from "../providers/aws/s3file";
import { Cognito } from "../providers/aws/cognito";
import { Dynamo } from "../providers/aws/dynamo/dynamo";
import { FBConnect } from "../providers/facebook/fb_connect";
import { FBJSSDK } from "../providers/facebook/fb_jssdk";
import { LineupController } from "../providers/model/lineup/lineup";
import { Prompt } from "../providers/util/prompt";

@NgModule({
    declarations: [
        MyApp,
        ImageCardComponent,
        CustomPage,
        SpecDialog,
        HelpPage,
        HomePage,
        TermsPage
    ],
    imports: [
        IonicModule.forRoot(MyApp),
        CustomIconsModule
    ],
    bootstrap: [IonicApp],
    entryComponents: [
        MyApp,
        ImageCardComponent,
        CustomPage,
        SpecDialog,
        HelpPage,
        HomePage,
        TermsPage
    ],
    providers: [
        Storage,
        BootSettings,
        Configuration,
        Preferences,
        Credentials,
        S3File,
        S3Image,
        Cognito,
        Dynamo,
        FBConnect,
        FBJSSDK,
        LineupController,
        Prompt
    ]
})
export class AppModule {}
