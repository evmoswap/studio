import { Register } from '~app-toolkit/decorators';
import { AbstractApp } from '~app/app.dynamic-module';
import { AaveV2AppModule } from '~apps/aave-v2/aave-v2.module';

import { AvalancheNereusFinanceBalanceFetcher } from './avalanche/nereus-finance.balance-fetcher';
import { AvalancheNereusFinanceStableDebtTokenFetcher } from './avalanche/nereus-finance.stable-debt.token-fetcher';
import { AvalancheNereusFinanceSupplyTokenFetcher } from './avalanche/nereus-finance.supply.token-fetcher';
import { AvalancheNereusFinanceVariableDebtTokenFetcher } from './avalanche/nereus-finance.variable-debt.token-fetcher';
import { NereusFinanceContractFactory } from './contracts';
import { NereusFinanceAppDefinition, NEREUS_FINANCE_DEFINITION } from './nereus-finance.definition';

@Register.AppModule({
  appId: NEREUS_FINANCE_DEFINITION.id,
  imports: [AaveV2AppModule],
  providers: [
    AvalancheNereusFinanceBalanceFetcher,
    AvalancheNereusFinanceStableDebtTokenFetcher,
    AvalancheNereusFinanceVariableDebtTokenFetcher,
    AvalancheNereusFinanceSupplyTokenFetcher,
    NereusFinanceAppDefinition,
    NereusFinanceContractFactory,
  ],
})
export class NereusFinanceAppModule extends AbstractApp() {}
