import {Injectable} from "@angular/core";
import {Http} from "@angular/http";
import {SafeUrl, DomSanitizationService} from '@angular/platform-browser';
import {Storage, LocalStorage} from 'ionic-angular';

import {BootSettings} from "../config/boot_settings";
import {assert} from "../../util/assertion";
import {Logger} from "../../util/logging";
import {Cognito} from "./cognito";

import {AWS, S3, AWSRequest, requestToPromise} from "./aws";

const logger = new Logger("S3File");

@Injectable()
export class S3File {
    constructor(private settings: BootSettings, cognito: Cognito) {
        this.client = cognito.identity.then((x) => new AWS.S3());
    }

    private client: Promise<S3>;

    private async invoke<R>(proc: (s3client) => AWSRequest): Promise<R> {
        return requestToPromise<R>(proc(await this.client));
    }

    private async load(path: string): Promise<{Body: number[]}> {
        const bucketName = await this.settings.s3Bucket;
        logger.debug(() => `Reading file: ${bucketName}:${path}`);
        return await this.invoke<{ Body: number[] }>((s3) => s3.getObject({
            Bucket: bucketName,
            Key: path
        }));
    }

    async download(path: string, type: string = "image/jpeg"): Promise<Blob> {
        const res = await this.load(path);
        return new Blob([res.Body], { type: type });
    }

    async read(path: string): Promise<string> {
        const res = await this.load(path);
        return String.fromCharCode.apply(null, res.Body);
    }

    async write(path: string, text: string): Promise<void> {
        const bucketName = await this.settings.s3Bucket;
        logger.debug(() => `Write file: ${bucketName}:${path}`);
        await this.invoke((s3) => s3.putObject({
            Bucket: bucketName,
            Key: path,
            Body: text
        }));
    }

    async upload(path: string, blob: Blob): Promise<void> {
        const bucketName = await this.settings.s3Bucket;
        logger.debug(() => `Uploading file: ${bucketName}:${path}`);
        await this.invoke((s3) => s3.putObject({
            Bucket: bucketName,
            Key: path,
            Body: blob,
            ContentType: blob.type
        }));
    }

    async remove(path: string): Promise<void> {
        const bucketName = await this.settings.s3Bucket;
        logger.debug(() => `Removing file: ${bucketName}:${path}`);
        await this.invoke((s3) => s3.deleteObject({
            Bucket: bucketName,
            Key: path
        }));
    }

    async copy(src: string, dst: string): Promise<void> {
        const bucketName = await this.settings.s3Bucket;
        logger.debug(() => `Copying file: ${bucketName}:${src}=>${dst}`);
        await this.invoke((s3) => s3.copyObject({
            Bucket: bucketName,
            CopySource: `${bucketName}/${src}`,
            Key: dst
        }));
    }

    async move(src: string, dst: string): Promise<void> {
        await this.copy(src, dst);
        await this.remove(src);
    }

    async list(path: string): Promise<Array<string>> {
        const bucketName = await this.settings.s3Bucket;
        const res = await this.invoke<{ Contents: { Key: string }[] }>((s3) => s3.listObjects({
            Bucket: bucketName,
            Prefix: path
        }));
        return res.Contents.map((x) => x.Key);
    }

    async exists(path: string): Promise<boolean> {
        const bucketName = await this.settings.s3Bucket;
        logger.debug(() => `Checking exists: ${bucketName}:${path}`);
        try {
            const res = await this.invoke<{ ContentLength: number }>((s3) => s3.headObject({
                Bucket: bucketName,
                Key: path
            }));
            return !_.isNil(res);
        } catch (ex) {
            logger.warn(() => `Error on checking exists: ${bucketName}:${path}`);
            return false;
        }
    }

    async url(path: string, expiresInSeconds: number): Promise<string> {
        const s3: any = await this.client;
        const bucketName = await this.settings.s3Bucket;
        logger.debug(() => `Getting url of file: ${bucketName}:${path}`);
        try {
            return s3.getSignedUrl("getObject", {
                Bucket: bucketName,
                Key: path,
                Expires: expiresInSeconds
            });
        } catch (ex) {
            logger.warn(() => `Error on getting url: ${ex}`);
        }
    }
}

@Injectable()
export class S3Image {
    private local: Storage = new Storage(LocalStorage);

    constructor(private s3: S3File, private sanitizer: DomSanitizationService) { }

    async getUrl(s3path: string): Promise<SafeUrl> {
        assert("Caching S3 path", s3path);
        const url = await this.getCached(s3path);
        return this.sanitizer.bypassSecurityTrustUrl(url);
    }

    private async getCached(s3path: string): Promise<string> {
        try {
            const data = await this.local.get(s3path);
            if (!_.isNil(data) && await this.checkUrl(data)) {
                return data;
            }
        } catch (ex) {
            logger.info(() => `Failed to get local data: ${s3path}: ${ex}`);
        }
        const blob = await this.s3.download(s3path);
        const url = URL.createObjectURL(blob);
        this.local.set(s3path, url);
        return url;
    }

    private async checkUrl(url: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            var http = new XMLHttpRequest();
            http.onload = () => {
                resolve(_.floor(http.status / 100) == 2);
            };
            http.onerror = () => {
                logger.warn(() => `No data on ${url}`);
                resolve(false);
            };
            http.open('GET', url);
            http.send();
        });
    }
}
