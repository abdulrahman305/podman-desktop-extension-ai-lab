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

/* eslint-disable @typescript-eslint/no-explicit-any */

import { expect, test, vi } from 'vitest';
import content from './ai-test.json';
import { ApplicationManager } from './managers/applicationManager';
import { RecipeStatusRegistry } from './registries/RecipeStatusRegistry';
import { StudioApiImpl } from './studio-api-impl';
import { PlayGroundManager } from './playground';
import { TaskRegistry } from './registries/TaskRegistry';

vi.mock('./ai.json', () => {
    return {
        default: content
    };
});

const studioApiImpl = new StudioApiImpl(
    {} as unknown as ApplicationManager,
    {} as unknown as RecipeStatusRegistry,
    {} as unknown as TaskRegistry,
    {} as unknown as PlayGroundManager,
)

test('expect correct model is returned with valid id', () => {    
    const model = studioApiImpl.getModelById('llama-2-7b-chat.Q5_K_S');
    expect(model).toBeDefined();
    expect(model.name).toEqual('Llama-2-7B-Chat-GGUF');
    expect(model.registry).toEqual('Hugging Face');
    expect(model.url).toEqual('https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.Q5_K_S.gguf')
});

test('expect error if id does not correspond to any model', () => {
    expect(() => studioApiImpl.getModelById('unknown')).toThrowError(
        'No model found having id unknown',
    );
})
