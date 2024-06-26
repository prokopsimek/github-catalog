/* eslint-disable tailwindcss/no-custom-classname */
import { Search } from '@/components/Search';
import { github } from '@/lib/github';

import qry from '@/queries/listOrgReposQuery';
import { Heading, Container, Section, Table, Flex, Link, Badge } from '@radix-ui/themes';
import { formatDistance } from 'date-fns';
import { Suspense } from 'react';
import { Repository } from '@octokit/graphql-schema';

function getContrastYIQ(hexcolor: string | undefined) {
  if (!hexcolor) return 'black';
  const r = parseInt(hexcolor.substring(1, 3), 16);
  const g = parseInt(hexcolor.substring(3, 5), 16);
  const b = parseInt(hexcolor.substring(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? 'black' : 'white';
}

type SearchReposResult = {
  search: {
    repos: {
      repo: Repository;
    }[];
  };
};

const getData = async (org: string, query: string, page: number) => {
  // get all labels "label:xyz" or "topic:xyz" or "tag:xyz" from the query, if the xyz is in quotes, then it is one label and remove the quotes
  const labels = query
    .match(/(label|topic|tag):("[^"]+"|[^ ]+)/g)
    ?.map((label) => label.replace(/(label|topic|tag):/, '').replace(/"/g, ''));

  // get all languages "language:xyz" or "lang:xyz" from the query, if the xyz is in quotes, then it is one label and remove the quotes
  const languages = query
    .match(/(language|lang):("[^"]+"|[^ ]+)/g)
    ?.map((lang) => lang.replace(/(language|lang):/, '').replace(/"/g, ''));

  // get full text query without any strings that contains double dots
  const fullTextQuery = query.replace(/("[^"]+"|[^ ]+):("[^"]+"|[^ ]+)/g, '');

  const data: SearchReposResult = await github.graphql(qry(org, fullTextQuery, labels, languages));
  return data;
};

export default async function Home({
  searchParams,
}: {
  searchParams?: {
    query?: string;
    page?: string;
  };
}) {
  const org = process.env.GITHUB_ORG || 'DXHeroes';
  const query = searchParams?.query || '';
  const currentPage = Number(searchParams?.page) || 1;

  const data = await getData(org, query, currentPage);
  const repos = data.search.repos;

  return (
    <Section>
      <Container>
        <Heading size='8'>Service Catalog for {org}</Heading>
      </Container>

      <Container className='mt-12'>
        <Search placeholder='Search repositories...' />

        <Suspense fallback={<div>Loading...</div>}>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell className='w-9/12'>Repository</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Languages</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Last Update</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {/* zero data */}
              {repos.length === 0 && (
                <Table.Row>
                  <Table.Cell colSpan={3} className='text-center'>
                    No repositories found
                  </Table.Cell>
                </Table.Row>
              )}

              {repos.map((repo) => {
                if (!repo) return null;

                const topics = repo.repo.repositoryTopics?.nodes?.map((topic) => {
                  return (
                    <Link href={`/?query=topic:${topic!.topic.name}`} key={topic!.topic.name}>
                      <Badge color='indigo' key={topic!.topic.name}>
                        {topic!.topic.name}
                      </Badge>
                    </Link>
                  );
                });
                // const languages = repo?.languages?.edges?.map((lang) => lang!.node.name).join(', ');

                return (
                  <Table.Row key={repo.repo.name}>
                    <Table.Cell>
                      <Flex>
                        <Link href={`/r/${repo.repo.name}`}>
                          <Heading size='5'>{repo.repo.name}</Heading>
                        </Link>
                      </Flex>
                      <Flex>
                        <p className='mt-1 text-muted-foreground'>{repo.repo.description}</p>
                      </Flex>
                      <Flex className='mt-4' gap='2' wrap='wrap'>
                        {topics}
                      </Flex>
                    </Table.Cell>
                    <Table.Cell>
                      <Flex>
                        {repo.repo.primaryLanguage?.name && (
                          <Badge
                            // color='blue'
                            // className={`bg-[${repo!.primaryLanguage?.color}]`}
                            style={{
                              color: `${getContrastYIQ(repo.repo.primaryLanguage?.color as string | undefined)}`,
                              backgroundColor: `${repo.repo.primaryLanguage?.color}`,
                            }}
                          >
                            {repo.repo.primaryLanguage?.name}
                          </Badge>
                        )}
                      </Flex>
                      {/* <Flex>{languages}</Flex> */}
                    </Table.Cell>
                    <Table.Cell>
                      {formatDistance(new Date(), repo.repo.updatedAt, { addSuffix: true })}
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        </Suspense>
      </Container>
    </Section>
  );
}
