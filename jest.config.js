module.exports = {
	verbose: true,
	preset: 'ts-jest',
	collectCoverage: true,
	coverageDirectory: 'coverage',
	collectCoverageFrom: ['src/**/*.ts'],
	coverageReporters: ['text', 'html'],
	moduleFileExtensions: ['ts', 'js'],
	transform: {
		'^.+\\.ts$': 'ts-jest'
	},
	testMatch: ['**/*.test.ts'],
	testEnvironment: 'node',
}
