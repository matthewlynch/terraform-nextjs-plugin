/* eslint-disable unicorn/prevent-abbreviations */
// @ts-nocheck
const { checkConfiguration, setConfiguration, getGatewayKey } = require("../src/configuration");
const { PROVIDERS } = require("../src/constants");
const { getGatewayResourceId } = require("../src/providers/aws/shared");

describe("Configuration", () => {
	it("should throw an error when configuration is empty", () => {
		const errors = checkConfiguration();

		expect(errors).toHaveLength(1);
		const er = errors.find(error => error.type === "EmptyConfigurationError");
		expect(er.message).toBe("Empty configuration, cannot proceed.");
	});

	it("should throw an error when gatewayKey is not provided", () => {
		const errors = checkConfiguration({});
		expect(errors.find(error => error.message === "gatewayKey is missing, it must be provided")).toBeDefined();
	});

	it("should throw an error when lambdaPath is not provided", () => {
		const errors = checkConfiguration({});
		expect(errors.find(error => error.message === "nextAppDir is missing, it must be provided")).toBeDefined();
	});

	it("should throw an error when routes is are malformed", () => {
		const errors = checkConfiguration({
			gatewayKey: "myTest",
			lambdaPath: "/path",
			routes: {
				prefix: "",
				mappings: [
					{
						page: "/"
					}
				]
			}
		});

		expect(errors.find(error => error.message === "The object containing the routes is not correct")).toBeDefined();

		const errors2 = checkConfiguration({
			gatewayKey: "myTest",
			lambdaPath: "/path",
			routes: [
				{
					prefix: "home",
					mappings: [
						{
							page: "/content",
							route: "ehy"
						}
					]
				},
				{
					prefix: "blog",
					mappings: [
						{
							route: "ehy"
						}
					]
				}
			]
		});
		expect(errors2.find(error => error.message === "The object containing the routes is not correct")).toBeDefined();
	});

	it("should return true when the configuration is correct", () => {
		expect(
			checkConfiguration({
				gatewayKey: "myTest",
				nextAppDir: "/path",
				routes: {
					prefix: "",
					mappings: [
						{
							page: "/content",
							route: "ehy"
						}
					]
				},
				provider: "AWS"
			})
		).toBe(true);

		expect(
			checkConfiguration({
				gatewayKey: "myTest",
				nextAppDir: "/path",
				routes: [
					{
						prefix: "home",
						mappings: [
							{
								page: "/content",
								route: "ehy"
							}
						]
					},
					{
						prefix: "blog",
						mappings: [
							{
								page: "/content",
								route: "ehy"
							}
						]
					}
				],

				provider: "AWS"
			})
		).toBe(true);
	});

	it("should return the gateway key", () => {
		setConfiguration({ gatewayKey: "myTest", nextAppDir: "/path" });
		expect(getGatewayResourceId()).toEqual("${aws_api_gateway_rest_api.myTest.id}");
	});

	it("should return the gateway key", () => {
		setConfiguration({ gatewayKey: "myTest", nextAppDir: "/path" });
		expect(getGatewayKey()).toEqual("myTest");
	});

	it("should throw an error when provider is not passed", () => {
		const errors = checkConfiguration({
			gatewayKey: "myTest",
			nextAppDir: "/path",
			routes: {
				prefix: "",
				mappings: [
					{
						page: "/content",
						route: "ehy"
					}
				]
			}
		});
		expect(errors.find(error => error.message === "provider is missing, it must be provided")).toBeDefined();
	});

	it("should throw an error when provider is not supported", () => {
		const errors = checkConfiguration({
			gatewayKey: "myTest",
			nextAppDir: "/path",
			routes: {
				prefix: "",
				mappings: [
					{
						page: "/content",
						route: "ehy"
					}
				]
			},
			provider: "Azure"
		});

		expect(
			errors.find(error => error.message === "Azure provider is not supported. Choose between: " + Object.keys(PROVIDERS).join(", "))
		).toBeDefined();
	});
});
