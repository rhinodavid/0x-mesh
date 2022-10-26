import { int, Integer, Session } from 'neo4j-driver';

/**
 * Node representing an ethereum account or contract
 */
export default class Account {
    static label = 'Account';
    constructor(public address: string, public chainId: number, public symbol: string | null) {}

    // TODO (rhinodavid): Add a `safe` parameter to ensure no dublicates on address
    async create(session: Session) {
        const command = `CREATE (:${Account.label} {address: '${this.address}', chainId: ${int(
            this.chainId
        )}, symbol: ${this.symbol ? "'" + this.symbol + "'" : null}})`;
        await session.run(command);
    }
}

export async function find(params: { address: string }, session: Session): Promise<Account[]> {
    const command = `MATCH (x:${Account.label} {address: '${params.address}'}) RETURN x.address, x.chainId, x.symbol`;
    const results = await session.run(command);
    const objects = results.records.map(r => {
        // TODO (rhinodavid): Add hidden node ID that gets written here
        const address = r.get('x.address');
        const chainId = (r.get('x.chainId') as Integer).toInt();
        const symbol = r.get('x.symbol');
        return new Account(address, chainId, symbol);
    });
    return objects;
}

export async function deleteAll(session: Session): Promise<void> {
    const command = `MATCH (x:${Account.label}) DELETE x`;
    await session.run(command);
    // TODO (rhinodavid): Make this return the records deleted or something
}
