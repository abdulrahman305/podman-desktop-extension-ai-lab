/**********************************************************************
 * Copyright (C) 2024 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/
import type { VMType } from './IPodman';
import type { ModelCheckerInfo } from './IModelInfo';

export interface ContainerProviderConnectionInfo {
  providerId: string;
  name: string;
  type: 'podman'; // we only support podman
  status: 'started' | 'stopped' | 'starting' | 'stopping' | 'unknown';
  vmType: VMType;
}

export interface CheckContainerConnectionResourcesOptions {
  modelInfo: ModelCheckerInfo;
  connection?: ContainerProviderConnectionInfo;
}

export type ContainerConnectionInfo =
  | RunningContainerConnection
  | LowResourcesContainerConnection
  | NoContainerConnection
  | NativeContainerConnection;

export type ContainerConnectionInfoStatus = 'running' | 'no-machine' | 'low-resources';

export interface RunningContainerConnection {
  name: string;
  status: 'running';
  canRedirect: boolean;
}

export interface LowResourcesContainerConnection {
  name: string;
  cpus: number;
  memoryIdle: number;
  cpusExpected: number;
  memoryExpected: number;
  status: 'low-resources';
  canEdit: boolean;
  canRedirect: boolean;
}

export interface NoContainerConnection {
  status: 'no-machine';
  canRedirect: boolean;
}

export interface NativeContainerConnection {
  status: 'native';
  canRedirect: boolean;
}
