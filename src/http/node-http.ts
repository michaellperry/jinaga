import { HttpConnection, HttpResponse } from "./web-client";
import * as http from "http";
import * as https from "https";
import * as url from "url";

export class NodeHttpConnection implements HttpConnection {
    constructor(
        private url: string) {
    }

    get(path: string): Promise<{}> {
        return new Promise<{}>((resolve, reject) => {
            const { protocol } = url.parse(this.url + path);
            const get = protocol === "https:" ? https.get : http.get;
            let data = "";
            get(this.url + path, response => {
                response.on("data", chunk => {
                    data += chunk;
                });

                response.on("end", () => {
                    try {
                        const result = JSON.parse(data);
                        resolve(result);
                    }
                    catch (x) {
                        reject(x);
                    }
                });
            }).on("error", err => reject(err));
        });
    }
    
    post(tail: string, body: {}, timeoutSeconds: number): Promise<HttpResponse> {
        return new Promise<HttpResponse>((resolve, reject) => {
            const { protocol, host, port, path } = url.parse(this.url + tail);
            const request = protocol === "https:" ? https.request : http.request;
            let response = "";
            const req = request({
                method: "POST",
                host, port, path,
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                timeout: timeoutSeconds * 1000
            }, res => {
                res.on("data", chunk => {
                    if (chunk instanceof Buffer) {
                        response += chunk.toString();
                    }
                    else {
                        response += chunk;
                    }
                });
                res.on("error", err => {
                    resolve({
                        result: "failure",
                        error: err.message
                    });
                });
                res.on("end", () => {
                    if (res.statusCode === 403) {
                        reject(response);
                    }
                    else if (res.statusCode>= 400) {
                        resolve({
                            result: "retry",
                            error: response
                        });
                    }
                    else if (isJsonResult(res.headers["content-type"])) {
                        try {
                            const json = JSON.parse(response);
                            resolve({
                                result: "success",
                                response: json
                            });
                        }
                        catch (x) {
                            reject(x);
                        }
                    }
                    else {
                        reject(response);
                    }
                });
            });

            req.on("error", err => {
                resolve({
                    result: "failure",
                    error: err.message
                });
            });

            req.write(JSON.stringify(body));
            req.end();
        });
    }
}

function isJsonResult(contentType: string) {
    const json = contentType.split(";").indexOf("application/json");
    return json >= 0;
}