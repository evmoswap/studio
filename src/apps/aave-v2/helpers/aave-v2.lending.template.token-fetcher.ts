import { Inject } from '@nestjs/common';

import { APP_TOOLKIT, IAppToolkit } from '~app-toolkit/app-toolkit.interface';
import { getLabelFromToken } from '~app-toolkit/helpers/presentation/image.present';
import {
  AppTokenTemplatePositionFetcher,
  DataPropsStageParams,
  DisplayPropsStageParams,
  UnderlyingTokensStageParams,
} from '~position/template/app-token.template.position-fetcher';

import { AaveV2ContractFactory } from '../contracts';
import { AaveV2AToken } from '../contracts/ethers/AaveV2AToken';

export type AaveV2TemplateTokenDataProps = {
  apy: number;
  enabledAsCollateral: boolean;
  liquidity: number;
  liquidationThreshold: number;
  isActive: boolean;
};

export type AaveV2ReserveTokenAddressesData = {
  aTokenAddress: string;
  stableDebtTokenAddress: string;
  variableDebtTokenAddress: string;
};

export type AaveV2ReserveApyData = {
  supplyApy: number;
  stableBorrowApy: number;
  variableBorrowApy: number;
};

export type AaveV2ReserveConfigurationData = {
  enabledAsCollateral: boolean;
  liquidationThreshold: number;
};

export type AaveV2LendingTokenDataProps = {
  apy: number;
  enabledAsCollateral: boolean;
  liquidity: number;
  liquidationThreshold: number;
};

export abstract class AaveV2LendingTemplateTokenFetcher extends AppTokenTemplatePositionFetcher<
  AaveV2AToken,
  AaveV2LendingTokenDataProps
> {
  constructor(
    @Inject(APP_TOOLKIT) protected readonly appToolkit: IAppToolkit,
    @Inject(AaveV2ContractFactory) protected readonly contractFactory: AaveV2ContractFactory,
  ) {
    super(appToolkit);
  }

  abstract isDebt: boolean;
  abstract providerAddress: string;
  abstract getTokenAddress(reserveTokenAddressesData: AaveV2ReserveTokenAddressesData): string;
  abstract getApy(reserveApyData: AaveV2ReserveApyData): number;

  getContract(address: string): AaveV2AToken {
    return this.contractFactory.aaveV2AToken({ network: this.network, address });
  }

  async getAddresses(): Promise<string[]> {
    const multicall = this.appToolkit.getMulticall(this.network);
    const pool = multicall.wrap(
      this.contractFactory.aaveProtocolDataProvider({
        network: this.network,
        address: this.providerAddress,
      }),
    );

    const reserveTokens = await pool.getAllReservesTokens();
    const reserveTokenAddreses = reserveTokens.map(v => v[1]);
    const reserveTokensData = await Promise.all(reserveTokenAddreses.map(r => pool.getReserveTokensAddresses(r)));

    return reserveTokensData.map(v =>
      this.getTokenAddress({
        aTokenAddress: v.aTokenAddress.toLowerCase(),
        stableDebtTokenAddress: v.stableDebtTokenAddress.toLowerCase(),
        variableDebtTokenAddress: v.variableDebtTokenAddress.toLowerCase(),
      }),
    );
  }

  async getUnderlyingTokenAddresses({ contract }: UnderlyingTokensStageParams<AaveV2AToken>) {
    return contract.UNDERLYING_ASSET_ADDRESS();
  }

  async getReserveApy({
    appToken,
    multicall,
  }: DataPropsStageParams<AaveV2AToken, AaveV2LendingTokenDataProps>): Promise<number> {
    const pool = multicall.wrap(
      this.contractFactory.aaveProtocolDataProvider({
        network: this.network,
        address: this.providerAddress,
      }),
    );

    const reservesData = await pool.getReserveData(appToken.tokens[0].address);

    return this.getApy({
      supplyApy: Number(reservesData.liquidityRate) / 10 ** 27,
      stableBorrowApy: Number(reservesData.stableBorrowRate) / 10 ** 27,
      variableBorrowApy: Number(reservesData.variableBorrowRate) / 10 ** 27,
    });
  }

  async getReserveConfigurationData({
    appToken,
    multicall,
  }: DataPropsStageParams<AaveV2AToken, AaveV2TemplateTokenDataProps>): Promise<AaveV2ReserveConfigurationData> {
    const pool = multicall.wrap(
      this.contractFactory.aaveProtocolDataProvider({
        network: this.network,
        address: this.providerAddress,
      }),
    );

    const reserveConfigurationData = await pool.getReserveConfigurationData(appToken.tokens[0].address);
    const liquidationThreshold = Number(reserveConfigurationData.liquidationThreshold) / 10 ** 4;
    const enabledAsCollateral = reserveConfigurationData.usageAsCollateralEnabled;

    return { liquidationThreshold, enabledAsCollateral };
  }

  async getDataProps(opts: DataPropsStageParams<AaveV2AToken, AaveV2LendingTokenDataProps>) {
    const reserveConfigData = await this.getReserveConfigurationData(opts);
    const apy = await this.getReserveApy(opts);

    const { appToken } = opts;
    const liquidity = (this.isDebt ? -1 : 1) * appToken.price * appToken.supply;
    const isActive = Math.abs(liquidity) > 0;

    return { liquidity, isActive, apy, ...reserveConfigData };
  }

  async getLabel({ appToken }: DisplayPropsStageParams<AaveV2AToken, AaveV2LendingTokenDataProps>): Promise<string> {
    return getLabelFromToken(appToken.tokens[0]);
  }

  async getLabelDetailed({
    appToken,
  }: DisplayPropsStageParams<AaveV2AToken, AaveV2LendingTokenDataProps>): Promise<string> {
    return appToken.symbol;
  }
}
