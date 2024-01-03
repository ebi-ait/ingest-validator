import jwt, {SignOptions} from 'jsonwebtoken';
import * as fs from "fs";

interface GcpServiceAccountCredentials {
    client_email:string;
    private_key_id:string;
    private_key:string;
}
export class TokenManager {
    private token: string | null = null;
    accountCredentials: GcpServiceAccountCredentials;
    private audience: string;
    constructor(keyFilePath:string, audience:string) {
        const data = fs.readFileSync(keyFilePath, 'utf8');
        this.accountCredentials = JSON.parse(data) as GcpServiceAccountCredentials;
        this.audience = audience;

    }
    generateToken(): string {
        const payload:object = {
            'https://auth.data.humancellatlas.org/email': this.accountCredentials.client_email,
            'https://auth.data.humancellatlas.org/group': 'hca',
            'scope': ["openid", "email", "offline_access"],
        };
        const signOptions :SignOptions = {
            issuer: this.accountCredentials.client_email,
            subject: this.accountCredentials.client_email,
            keyid: this.accountCredentials.private_key_id,
            audience: this.audience,
            expiresIn: '1h',
            algorithm: "RS256"
        }

        const secretKey = this.accountCredentials.private_key;

        return jwt.sign(payload, secretKey, signOptions);
    }

    private isTokenExpired(token: string | null): boolean {
        if (!token) {
            return true;
        }

        try {
            const decoded = jwt.decode(token) as { [key: string]: any };
            if (!decoded || !decoded.exp) {
                return true;
            }

            const currentTime = Math.floor(Date.now() / 1000);
            return decoded.exp < currentTime;
        } catch (error) {
            return true;
        }
    }

    public getToken(): string {
        if (!this.token || this.isTokenExpired(this.token)) {
            this.token = this.generateToken();
        }
        return this.token;
    }
}
