import {BootSettings} from "./config/boot_settings";
import {Configuration} from "./config/configuration";
import {Preferences} from "./config/preferences";
import {Credentials} from "./config/credentials";
import {S3File, S3Image} from "./aws/s3file";
import {Cognito} from "./aws/cognito";
import {Dynamo} from "./aws/dynamo/dynamo";
import {FBConnect} from "./facebook/fb_connect";
import {FBJSSDK} from "./facebook/fb_jssdk";
import {LineupController} from "./model/lineup/lineup";
import {Prompt} from "./util_prompt";

export const FATHENS_PROVIDERS = [
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
];
