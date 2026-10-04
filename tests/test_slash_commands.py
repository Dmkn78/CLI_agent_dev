"""Project skill discovery survives generated artifacts without widening its scan."""
import tempfile
import unittest
from pathlib import Path

from server.slash_commands import MAX_COMMANDS, SlashCommands


class EmptyStore:
    def __init__(self):
        self.commands = []

    def all(self, kind):
        return self.commands if kind == 'command' else []


class ProjectHost:
    def __init__(self, root):
        self.root, self.store = root, EmptyStore()

    def file_path(self, project_id, relative=''):
        return self.root / relative


class SkillDiscoveryTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.host = ProjectHost(self.root)
        self.commands = SlashCommands(self.host)

    def tearDown(self):
        self.temporary.cleanup()

    def skill(self, folder, contents='Instructions locales.'):
        path = self.root / folder / 'SKILL.md'
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(contents, encoding='utf-8')
        return path

    def test_explicit_skill_roots_are_discovered_before_the_general_scan_limit(self):
        # A large unrelated source tree sorts before skills/ and exhausts 500 directories.
        for index in range(510):
            (self.root / 'a-generated' / str(index)).mkdir(parents=True)
        self.skill('skills/duplica-supervisor')
        self.skill('.agents/skills/local-agent')
        catalog = self.commands.catalog('atelier')
        self.assertEqual({command['path'] for command in catalog}, {
            'skills/duplica-supervisor/SKILL.md', '.agents/skills/local-agent/SKILL.md'})
        self.assertIn('Instructions locales.', self.commands.expand('atelier', '/duplica-supervisor mission'))

    def test_generated_build_dist_and_dependencies_do_not_become_commands(self):
        self.skill('build/delivery/dist/mac/phantom')
        self.skill('dist/copied-skills/phantom')
        self.skill('mobile/android/app/build/generated/phantom')
        self.skill('mobile/node_modules/dependency/phantom')
        self.skill('skills/real-skill')
        catalog = self.commands.catalog('atelier')
        self.assertEqual([command['name'] for command in catalog], ['real-skill'])

    def test_preferred_roots_deduplicate_names_and_preserve_explicit_prompts(self):
        self.skill('skills/shared', 'Projet canonique.')
        self.skill('.agents/skills/shared', 'Agent secondaire.')
        self.skill('sources/shared', 'Copie dans les sources.')
        self.skill('skills/explicit')
        self.host.store.commands.append({'id': 'command_one', 'projectId': 'atelier', 'name': 'explicit',
                                         'kind': 'prompt', 'prompt': 'Consigne utilisateur {args}'})
        catalog = self.commands.catalog('atelier')
        self.assertEqual(len(catalog), 2)
        shared = next(command for command in catalog if command['name'] == 'shared')
        self.assertEqual(shared['path'], 'skills/shared/SKILL.md')
        self.assertIn('Projet canonique.', self.commands.expand('atelier', '/shared mission'))
        self.assertIn('Consigne utilisateur mission', self.commands.expand('atelier', '/explicit mission'))

    def test_command_limit_stays_bounded_in_the_preferred_roots(self):
        for index in range(MAX_COMMANDS + 5):
            self.skill('skills/skill-' + str(index).zfill(3))
        self.assertEqual(len(self.commands.catalog('atelier')), MAX_COMMANDS)

    def test_symlink_roots_and_private_resources_remain_excluded(self):
        outside = self.root / '.private-library'
        self.skill('.private-library/foreign')
        (self.root / 'skills').symlink_to(outside, target_is_directory=True)
        self.skill('.agents/private/hidden')
        self.skill('.other/hidden')
        self.assertEqual(self.commands.catalog('atelier'), [])


if __name__ == '__main__':
    unittest.main()
