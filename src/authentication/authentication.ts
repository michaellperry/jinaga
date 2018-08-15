import { Feed } from '../feed/feed';
import { LoginResponse } from '../http/messages';

export interface Authentication extends Feed {
    login(): Promise<LoginResponse>
}