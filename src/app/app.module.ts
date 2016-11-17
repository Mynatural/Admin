import { NgModule } from "@angular/core";
import { Storage } from "@ionic/storage";
import { IonicApp, IonicModule } from "ionic-angular";

import { MyApp } from "./app.component";

import { HomePage } from "../pages/home/home";
import { CategoriesPage } from "../pages/categories/categories";
import { CategoriesTabMulti } from "../pages/categories/tab_multi";
import { CategoriesTabSingle } from "../pages/categories/tab_single";
import { ItemGroupPage } from "../pages/lineup/item_group";
import { ItemPage } from "../pages/lineup/item/item";
import { ItemTabAttributes } from "../pages/lineup/item/tab_attributes";
import { ItemTabImages } from "../pages/lineup/item/tab_images";
import { ItemTabMeasures } from "../pages/lineup/item/tab_measures";
import { ItemTabSpecs } from "../pages/lineup/item/tab_specs";
import { SpecGroupPage } from "../pages/lineup/spec_group";
import { SpecPage } from "../pages/lineup/spec";
import { DerivGroupPage } from "../pages/lineup/deriv_group";
import { DerivPage } from "../pages/lineup/deriv";
import { MeasurePage } from "../pages/lineup/measure";

import { CategoryComponent } from "../components/category/category";
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
import { CategoryController } from "../providers/model/lineup/category";
import { LineupController } from "../providers/model/lineup/lineup";
import { Prompt } from "../providers/util/prompt";

@NgModule({
    declarations: [
        MyApp,
        CategoryComponent,
        ImageCardComponent,
        HomePage,
        CategoriesPage,
        CategoriesTabMulti,
        CategoriesTabSingle,
        ItemGroupPage,
        ItemPage,
        ItemTabAttributes,
        ItemTabImages,
        ItemTabMeasures,
        ItemTabSpecs,
        SpecGroupPage,
        SpecPage,
        DerivGroupPage,
        DerivPage,
        MeasurePage
    ],
    imports: [
        IonicModule.forRoot(MyApp)
    ],
    bootstrap: [IonicApp],
    entryComponents: [
        MyApp,
        HomePage,
        CategoriesPage,
        CategoriesTabMulti,
        CategoriesTabSingle,
        ItemGroupPage,
        ItemPage,
        ItemTabAttributes,
        ItemTabImages,
        ItemTabMeasures,
        ItemTabSpecs,
        SpecGroupPage,
        SpecPage,
        DerivGroupPage,
        DerivPage,
        MeasurePage
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
        CategoryController,
        LineupController,
        Prompt
    ]
})
export class AppModule {}
