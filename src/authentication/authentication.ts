import { Feed } from '../feed/feed';
import { LoginResponse } from '../http/messages';
import { FactRecord } from '../storage';

export interface Authentication extends Feed {
    login(): Promise<LoginResponse>;
    local(): Promise<FactRecord>;
}