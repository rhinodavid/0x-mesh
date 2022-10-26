import { gql, createClient, Client } from '@urql/core';
import neo4j, { Session } from 'neo4j-driver';
import { config } from 'dotenv';
import Account, { deleteAll as deleteAllAccounts } from './Account';
import { deleteAll as deleteAllFills, Fill } from './Fill';
import { Bar } from 'cli-progress';

config();

const fillsQuery = gql`
    query FillsQuery($limit: Int) {
        fills(limit: $limit, order_by: { timestamp: desc }) {
            makerToken
            makerTokenSymbol
            takerToken
            takerTokenSymbol
            volumeUSD
            timestamp
            chain {
                reference
            }
        }
    }
`;

async function createMeshFetch(session: Session, dataApiClient: Client, limit: number, pageSize: number = 5) {
    const progressBar = new Bar({
        // green bar, reset styles after bar element
        format: ' >> [\u001b[32m{bar}\u001b[0m] {percentage}% | ETA: {eta}s | {value}/{total}',
        // same chars for bar elements, just separated by colors
        forceRedraw: true,
        // change color to yellow between bar complete/incomplete -> incomplete becomes yellow
        barGlue: '\u001b[33m'
    });

    // start the progress bar with a total value of 200 and start value of 0
    progressBar.start(limit, 0);

    let offset = 0;
    while (offset * pageSize < limit) {
        const results = await dataApiClient
            .query<{
                fills: {
                    makerToken: string;
                    makerTokenSymbol: string;
                    takerToken: string;
                    takerTokenSymbol: string;
                    volumeUSD: number;
                    timestamp: string;
                    chain: {
                        reference: string;
                        __typename: string;
                    };
                    __typename: string;
                }[];
            }>(fillsQuery, { limit: pageSize })
            .toPromise();
        // TODO (rhinodavid): Remove force unwrap
        const { fills } = results.data!;

        const createdAccounts = new Set<string>();

        // TODO (rhinodavid): stream
        for (let fill of fills) {
            const makerToken = new Account(fill.makerToken, parseInt(fill.chain.reference), fill.makerTokenSymbol);
            const takerToken = new Account(fill.takerToken, parseInt(fill.chain.reference), fill.takerTokenSymbol);
            if (!createdAccounts.has(makerToken.address)) {
                createdAccounts.add(makerToken.address);
                await makerToken.create(session);
            }
            if (!createdAccounts.has(takerToken.address)) {
                createdAccounts.add(takerToken.address);
                await takerToken.create(session);
            }

            const fillRelationship = new Fill(makerToken, takerToken, fill.volumeUSD, new Date(fill.timestamp));
            await fillRelationship.create(session);
        }
        offset++;

        progressBar.update(offset * pageSize);
    }
    progressBar.stop();
}

async function main() {
    const dataApiClient = createClient({
        url: process.env.DATA_API_GRAPHQL_URL ?? '',
        fetchOptions: () => {
            return {
                headers: { '0x-api-key': process.env.DATA_API_API_KEY ?? '' }
            };
        }
    });
    const driver = neo4j.driver('neo4j://localhost', neo4j.auth.basic('neo4j', 'liquidity'));
    const session = driver.session({ defaultAccessMode: neo4j.session.WRITE });
    await deleteAllFills(session);
    await deleteAllAccounts(session);
    /////////////////////////////////////
    await createMeshFetch(session, dataApiClient, /* limit */ 100, /* page size */ 10);
    /////////////////////////////////////

    session.close();
    driver.close();
}
main();
