import neo4j, { Driver, Session } from 'neo4j-driver';
import { config } from 'dotenv';
import Account, { deleteAll as deleteAllAccounts, find } from './Account';
import { deleteAll as deleteAllFills, Fill } from './Fill';

config();

async function createShibNodes(session: Session): Promise<Account[]> {
    const shibPolygon = new Account('0x6f8a06447Ff6FcF75d803135a7de15CE88C1d4ec', 137, 'SHIBA INU (PoS)');
    await shibPolygon.create(session);
    const shib = new Account('0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', 1, 'SHIB');
    await shib.create(session);

    const shibs = await find(shib, session);
    const polyshibs = await find({ address: '0x6f8a06447Ff6FcF75d803135a7de15CE88C1d4ec' }, session);
    return [...shibs, ...polyshibs];
}

async function main() {
    const driver = neo4j.driver('neo4j://localhost', neo4j.auth.basic('neo4j', 'liquidity'));
    const session = driver.session({ defaultAccessMode: neo4j.session.WRITE });
    //         SETUP
    //////////////////////////////
    // Clear shibs
    await deleteAllFills(session);
    await deleteAllAccounts(session);
    const [shib1, shib2] = await createShibNodes(session);
    const fill = new Fill(shib1, shib2, 42069.666, new Date('2022-09-21'));
    await fill.create(session);

    /////////////////////////////
    //        TEARDOWN
    session.close();
    driver.close();
}

main();
