import { test } from '../../playwright-utils/fixtures';

test('GET /api/tags returns a list of tags', async ({ api }) => {
  await api.tagsApi.fetchTags();
  await api.tagsApi.expectTagsListReturned();
});
