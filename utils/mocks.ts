import {IGlowData,IGoogleUserProfile} from '../types';

let mockGlowsDb: IGlowData[] = [
  {  message: "Hello Crace!", locale: "Crace", timestamp: new Date().toISOString(), user_email: "test@user.com" },
  {  message: "Hi Kaleen!", locale: "Kaleen", timestamp: new Date().toISOString(), user_email: "hello@user.com" }
];


export { mockGlowsDb };