
export interface IGoogleUserProfile {
    iss: string;
    azp: string;
    aud: string;
    sub: string;
    email: string;
    email_verified: boolean;
    nbf: number;
    name: string;
    picture: string;
    given_name: string;
    family_name: string;
    iat: number;
    exp: number;
    jti: string;
}

export interface INodeStatus {
  status: string; // e.g., 'online', 'offline', 'maintenance'
}

export interface INodesCollection {
  nodeA: INodeStatus;
  nodeB: INodeStatus;
  [key: string]: INodeStatus; // Allows for scaling beyond Node A & B if your backend expands
}

export interface IGlowData {
  message: string;        
  locale: string;         // e.g., 'Palm','Crace','Kaleen','Gira'
  timestamp: string;      // Formatted via toLocaleTimeString()
  nodes: INodesCollection;
}