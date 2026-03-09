import { runCli } from './app/run-cli.js';

runCli().catch((error) => {
  console.error(error);
  process.exit(1);
});
