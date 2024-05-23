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

import { beforeEach, describe, vi, expect, test } from 'vitest';
import { PodManager } from './PodManager';
import type { ContainerInspectInfo, PodInfo } from '@podman-desktop/api';
import { containerEngine } from '@podman-desktop/api';

vi.mock('@podman-desktop/api', () => ({
  containerEngine: {
    listPods: vi.fn(),
    inspectContainer: vi.fn(),
  },
}));

beforeEach(() => {
  vi.resetAllMocks();

  // we return the id as health status
  vi.mocked(containerEngine.inspectContainer).mockImplementation(async (engineId: string, id: string) => {
    return {
      State: {
        Health: {
          Status: id,
        },
      },
    } as unknown as ContainerInspectInfo;
  });
});

test('getAllPods should use container engine list pods method', async () => {
  await new PodManager().getAllPods();

  expect(containerEngine.listPods).toHaveBeenCalledOnce();
});

test('findPodByLabelsValues should only return pods with labels matching values', async () => {
  vi.mocked(containerEngine.listPods).mockResolvedValue([
    {
      Id: 'pod-id-1',
      Labels: {
        'dummy-key': 'dummy-invalid',
        hello: 'eggs',
      },
    },
    {
      Id: 'pod-id-2',
      Labels: {
        hello: 'world',
        'dummy-key': 'dummy-valid',
      },
    },
    {
      Id: 'pod-id-2',
      Labels: {
        hello: 'world',
        'dummy-key': 'invalid',
      },
    },
    {
      Id: 'pod-id-3',
    },
  ] as unknown as PodInfo[]);

  const pod = await new PodManager().findPodByLabelsValues({
    'dummy-key': 'dummy-valid',
    hello: 'world',
  });
  expect(pod).toBeDefined();
  expect(pod?.Id).toBe('pod-id-2');
});

test('getPodsWithLabels should only return pods with proper labels', async () => {
  vi.mocked(containerEngine.listPods).mockResolvedValue([
    {
      Id: 'pod-id-1',
      Labels: {
        'dummy-key': 'dummy-value',
        hello: 'world',
      },
    },
    {
      Id: 'pod-id-2',
      Labels: {
        hello: 'world',
        'dummy-key': 'dummy-value',
      },
    },
    {
      Id: 'pod-id-3',
    },
  ] as unknown as PodInfo[]);
  const pods = await new PodManager().getPodsWithLabels(['dummy-key']);
  expect(pods.length).toBe(2);
  expect(pods.find(pod => pod.Id === 'pod-id-1')).toBeDefined();
  expect(pods.find(pod => pod.Id === 'pod-id-2')).toBeDefined();
  expect(pods.find(pod => pod.Id === 'pod-id-3')).toBeUndefined();
});

describe('getHealth', () => {
  test('getHealth with no container should be none', async () => {
    const health = await new PodManager().getHealth({
      Containers: [],
    } as unknown as PodInfo);
    expect(health).toBe('none');
  });

  test('getHealth with one healthy should be healthy', async () => {
    const health = await new PodManager().getHealth({
      Containers: [
        {
          Id: 'healthy',
        },
      ],
    } as unknown as PodInfo);
    expect(health).toBe('healthy');
  });

  test('getHealth with many healthy and one unhealthy should be unhealthy', async () => {
    const health = await new PodManager().getHealth({
      Containers: [
        {
          Id: 'healthy',
        },
        {
          Id: 'unhealthy',
        },
        {
          Id: 'healthy',
        },
        {
          Id: 'starting',
        },
      ],
    } as unknown as PodInfo);
    expect(health).toBe('unhealthy');
  });

  test('getHealth with many healthy and one starting should be starting', async () => {
    const health = await new PodManager().getHealth({
      Containers: [
        {
          Id: 'healthy',
        },
        {
          Id: 'healthy',
        },
        {
          Id: 'starting',
        },
      ],
    } as unknown as PodInfo);
    expect(health).toBe('starting');
  });
});