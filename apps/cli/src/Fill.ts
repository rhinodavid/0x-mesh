import { DateTime, Session, Time } from 'neo4j-driver-core';
import Account from './Account';

export class Fill {
    static label = 'Fill';
    constructor(
        public makerToken: Account,
        public takerToken: Account,
        public volumeUsd: /* float */ number,
        public timestamp: Date
    ) {}

    // TODO (rhinodavid): Add a `safe` parameter to ensure no dublicates on address
    async create(session: Session) {
        // prettier-ignore
        const command = `MATCH (makerToken:Account), (takerToken:Account) WHERE makerToken.address = '${this.makerToken.address}' AND takerToken.address = '${this.takerToken.address}' CREATE (makerToken)-[r:${Fill.label} {volumeUsd: ${this.volumeUsd}, timestamp: datetime("${DateTime.fromStandardDate(this.timestamp).toString()}")}]->(takerToken) RETURN type(r)`;
        await session.run(command);
    }
}

export async function deleteAll(session: Session): Promise<void> {
    const command = `match ()-[fills:${Fill.label}]-() delete(fills)`;
    await session.run(command);
    // TODO (rhinodavid): Make this return the records deleted or something
}
