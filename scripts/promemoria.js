// Esecuzione manuale del job promemoria (utile da cron o launchd).
import '../src/env.js';
import { eseguiJobPromemoria } from '../src/promemoria.js';

const esito = await eseguiJobPromemoria();
console.log(JSON.stringify(esito, null, 2));
