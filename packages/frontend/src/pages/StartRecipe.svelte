<script lang="ts">
import { faFolder, faRocket, faUpRightFromSquare, faWarning } from '@fortawesome/free-solid-svg-icons';
import { catalog } from '/@/stores/catalog';
import Fa from 'svelte-fa';
import type { Recipe } from '@shared/src/models/IRecipe';
import type { LocalRepository } from '@shared/src/models/ILocalRepository';
import { findLocalRepositoryByRecipeId } from '/@/utils/localRepositoriesUtils';
import { localRepositories } from '/@/stores/localRepositories';
import { modelsInfo } from '/@/stores/modelsInfo';
import { Button, FormPage } from '@podman-desktop/ui-svelte';
import type { ModelInfo } from '@shared/src/models/IModelInfo';
import { InferenceType } from '@shared/src/models/IInference';
import { studioClient } from '/@/utils/client';
import type { Task } from '@shared/src/models/ITask';
import { filterByLabel } from '/@/utils/taskUtils';
import { tasks } from '/@/stores/tasks';
import TasksProgress from '/@/lib/progress/TasksProgress.svelte';
import { onMount } from 'svelte';
import { router } from 'tinro';
import type { ContainerConnectionInfo } from '@shared/src/models/IContainerConnectionInfo';
import { checkContainerConnectionStatus } from '/@/utils/connectionUtils';
import ContainerConnectionStatusInfo from '/@/lib/notification/ContainerConnectionStatusInfo.svelte';
import ModelSelect from '/@/lib/select/ModelSelect.svelte';

export let recipeId: string;

let recipe: Recipe | undefined;
$: recipe = $catalog.recipes.find(r => r.id === recipeId);

// recipe local path
let localPath: LocalRepository | undefined = undefined;
$: localPath = findLocalRepositoryByRecipeId($localRepositories, recipe?.id);

// Filter all models based on backend property
let models: ModelInfo[] = [];
$: models = $modelsInfo.filter(
  model => (model.backend ?? InferenceType.NONE) === (recipe?.backend ?? InferenceType.NONE),
);

// Hold the selected model
let value: (ModelInfo & { label: string; value: string }) | undefined = undefined;

$: {
  // let's select a default model
  if (value === undefined && recipe && models.length > 0) {
    value = getFirstRecommended();
  }
}

// The tracking id is a unique identifier provided by the
// backend when calling requestPullApplication
let trackingId: string | undefined = undefined;

// The trackedTasks are the tasks linked to the trackingId
let trackedTasks: Task[];

// Some tasks are running
let loading: boolean = false;

// All tasks are successful (not any in error)
let completed: boolean = false;

const getFirstRecommended = (): (ModelInfo & { label: string; value: string }) | undefined => {
  if (!recipe || !models) return undefined;
  const recommended = recipe.recommended && recipe.recommended.length > 0 ? recipe.recommended[0] : undefined;

  const model = models.find(model => model.id === recommended);
  if (!model) return undefined;
  return { ...model, label: model.name, value: model.id };
};

const processTasks = (tasks: Task[]) => {
  if (trackingId === undefined) {
    trackedTasks = [];
    return;
  }

  trackedTasks = filterByLabel(tasks, {
    trackingId: trackingId,
  });

  // if any task is still in loading state - we are not yet finished
  loading = trackedTasks.some(task => task.state === 'loading');

  // if all task are successful
  completed = trackedTasks.every(task => task.state === 'success');

  // if we re-open the page, we might need to restore the model selected
  populateModelFromTasks();
};

// This method uses the trackedTasks to restore the selected value of model
// It is useful when the page has been restored
function populateModelFromTasks(): void {
  const task = trackedTasks.find(
    task => task.labels && 'model-id' in task.labels && typeof task.labels['model-id'] === 'string',
  );
  const modelId = task?.labels?.['model-id'];
  if (!modelId) return;

  const model = models.find(model => model.id === modelId);
  if (!model) return;

  value = { ...model, label: model.name, value: model.id };
}

async function submit(): Promise<void> {
  if (!recipe || !value) return;

  loading = true;
  trackingId = await studioClient.requestPullApplication({
    recipeId: recipe.id,
    modelId: value.id,
  });
  router.location.query.set('trackingId', trackingId);
}

let connectionInfo: ContainerConnectionInfo | undefined;
$: if (value) {
  checkContainerConnectionStatus(models, value.id, 'recipe')
    .then(value => (connectionInfo = value))
    .catch((e: unknown) => console.error(String(e)));
}

onMount(() => {
  // Fetch any trackingId we could recover from query
  const query = router.location.query.get('trackingId');
  if (typeof query === 'string' && query.length > 0) {
    trackingId = query;
  }

  return tasks.subscribe(tasks => {
    processTasks(tasks);
  });
});

export function goToUpPage(): void {
  router.goto('/recipes');
}
</script>

<FormPage
  breadcrumbLeftPart="Recipes"
  breadcrumbRightPart="Start recipe"
  breadcrumbTitle="Go back to recipes page"
  title="Start recipe"
  onclose={goToUpPage}
  onbreadcrumbClick={goToUpPage}>
  <svelte:fragment slot="icon">
    <div class="rounded-full w-8 h-8 flex items-center justify-center">
      <Fa size="1.125x" class="text-[var(--pd-content-header-icon)]" icon={faRocket} />
    </div>
  </svelte:fragment>
  <svelte:fragment slot="content">
    <div class="flex flex-col w-full">
      <!-- warning machine resources -->
      {#if connectionInfo}
        <div class="mx-5">
          <ContainerConnectionStatusInfo connectionInfo={connectionInfo} />
        </div>
      {/if}

      <!-- tasks tracked -->
      {#if trackedTasks?.length > 0}
        <div class="mx-5 mt-5" role="status">
          <TasksProgress tasks={trackedTasks} />
        </div>
      {/if}

      {#if recipe}
        <!-- form -->
        <div class="space-y-6 bg-[var(--pd-content-card-bg)] m-5 px-8 sm:pb-6 xl:pb-8 rounded-lg h-fit">
          <div>
            <!-- selected recipe -->
            <label for="recipe" class="pt-4 block mb-2 font-bold text-[var(--pd-content-card-header-text)]"
              >Recipe</label>

            <div
              class="py-2 px-4 rounded-lg w-full flex flex-col bg-[var(--pd-content-bg)] text-[var(--pd-content-card-text)]">
              <span aria-label="Recipe name">{recipe.name}</span>
              {#if localPath}
                <div
                  class="bg-[var(--pd-label-bg)] text-[var(--pd-label-text)] max-w-full rounded-md p-2 mb-2 flex flex-row w-full h-min text-sm text-nowrap items-center">
                  <Fa class="mr-2" icon={faFolder} />
                  <span aria-label="Recipe local path" class="overflow-x-hidden text-ellipsis max-w-full">
                    {localPath.path}
                  </span>
                </div>
              {/if}
            </div>

            <!-- model form -->
            <label for="select-model" class="pt-4 block mb-2 font-bold text-[var(--pd-content-card-header-text)]"
              >Model</label>
            <ModelSelect
              bind:value={value}
              disabled={loading}
              recommended={recipe.recommended}
              models={models.map(model => ({ ...model, value: model.id, label: model.name }))} />
            {#if value && value.file === undefined}
              <div class="text-gray-800 text-sm flex items-center">
                <Fa class="mr-2" icon={faWarning} />
                <span role="alert"
                  >The selected model will be downloaded. This action can take some time depending on your connection</span>
              </div>
            {/if}
          </div>

          <footer>
            <div class="w-full flex flex-col">
              {#if completed}
                <Button
                  icon={faUpRightFromSquare}
                  title="Open details"
                  on:click={() => router.goto(`/recipe/${recipeId}/running`)}>
                  Open details
                </Button>
              {:else}
                <Button
                  title="Start {recipe.name} recipe"
                  inProgress={loading}
                  on:click={submit}
                  disabled={!value || loading}
                  icon={faRocket}>
                  Start {recipe.name} recipe
                </Button>
              {/if}
            </div>
          </footer>
        </div>
      {/if}
    </div>
  </svelte:fragment>
</FormPage>
