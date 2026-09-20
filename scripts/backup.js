// Copia di sicurezza manuale: `npm run backup`.
import { eseguiBackup } from '../src/backup.js';

const esito = eseguiBackup();
console.log(`Backup salvato in ${esito.file} (${Math.round(esito.dimensione / 1024)} KB).`);
