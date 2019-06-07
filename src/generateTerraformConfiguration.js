"use strict";
const { getRoutes } = require("./configuration");
const fs = require("fs");
const prettier = require("prettier");

const {
	generateGatewayResource,
	generateUniqueId
} = require("./resources/terraFormGatewayResource");
const { generateGatewayMethod } = require("./resources/terraFormGatewayMethod");
const {
	generateGatewayIntegration
} = require("./resources/terraFormGatewayIntegration");

const apiGatewayResource = {};
const apiGatewayMethod = {};
const apiGatewayIntegration = {};

const getParamsFromPath = pathname => {
	return pathname
		.split("/")
		.map(pathPart => {
			if (pathPart.includes(":")) {
				return {
					name: pathPart.replace(":", ""),
					mandatory: true
				};
			}
			return undefined;
		})
		.filter(Boolean);
};

const getQueryStringParamsFromPath = pathname => {
	return pathname
		.split("/")
		.map(pathPart => {
			if (pathPart.includes("?")) {
				return {
					name: pathPart.substring(pathPart.indexOf("?") + 1),
					mandatory: false
				};
			}
			return undefined;
		})
		.filter(Boolean);
};

let gatewayResourceId;
let uniqueName;

/**
 * @param {string[]} pathParts
 * @returns {string}
 */
const generateUniqueName = pathParts => {
	return pathParts
		.filter(Boolean)
		.map(p => p.replace(":", "").replace("?", ""))
		.join("-");
};

/**
 *
 * @param {string} pathPart
 * @param {number} index
 * @param {string[]} parts
 * @param {string} pathname
 * @param {string} lambdaName
 */
const handleResource = (pathPart, index, parts, pathname, lambdaName) => {
	const isUrlParam = pathPart.includes(":");
	const isQueryStringParam = pathPart.includes("?");
	const currentPathName = pathPart.replace(":", "").replace("?", "");
	// Generation of the gateway resource
	// we don't generate a gateway resource if the path part is a query string
	if (isQueryStringParam === false) {
		uniqueName = generateUniqueName(parts.slice(0, index + 1));

		// has a parent, generate Id of the parent
		if (index > 0) {
			// get the parent Id (generate it, actually)
			const parentId = generateUniqueId(
				generateUniqueName(parts.slice(0, index))
			);
			const { uniqueId, resource } = generateGatewayResource({
				id: uniqueName,
				pathname: currentPathName,
				parentId,
				isUrlParam
			});
			gatewayResourceId = uniqueId;
			apiGatewayResource[uniqueId] = resource;
		} else {
			const { uniqueId, resource } = generateGatewayResource({
				id: uniqueName,
				pathname: uniqueName,
				isUrlParam
			});
			gatewayResourceId = uniqueId;
			apiGatewayResource[uniqueId] = resource;
		}
	}

	// last part of the url, here we generate the method and the integration resources
	// also, we have to enter when we have a query string parameter.
	// In this last case, the gateway resource will belong to the father because hasn't been set
	if (index === parts.length - 1 || isQueryStringParam === true) {
		let params = [];
		let queryStringParams = [];
		if (isUrlParam) {
			params = getParamsFromPath(pathname);
		}
		if (isQueryStringParam) {
			queryStringParams = getQueryStringParamsFromPath(pathname);
		}
		const method = generateGatewayMethod({
			uniqueName,
			gatewayResourceId: gatewayResourceId,
			params,
			queryStringParams
		});

		apiGatewayMethod[method.uniqueId] = method.resource;

		const integration = generateGatewayIntegration({
			id: uniqueName,
			gatewayResourceId: gatewayResourceId,
			lambdaName,
			params,
			queryStringParams
		});
		apiGatewayIntegration[integration.uniqueId] = integration.resource;
	}

	// last part of the url, here we generate the method and the integration resources
	// also, we have to enter when we have a query string parameter.
	// In this last case, the gateway resource will belong to the father because hasn't been set
	if (index === parts.length - 1 || isQueryStringParam === true) {
		let params = [];
		let queryStringParams = [];
		if (isUrlParam) {
			params = getParamsFromPath(pathname);
		}
		if (isQueryStringParam) {
			queryStringParams = getQueryStringParamsFromPath(pathname);
		}
		const method = generateGatewayMethod({
			uniqueName,
			gatewayResourceId: gatewayResourceId,
			params,
			queryStringParams
		});

		apiGatewayMethod[method.uniqueId] = method.resource;

		const integration = generateGatewayIntegration({
			id: uniqueName,
			gatewayResourceId: gatewayResourceId,
			lambdaName,
			params,
			queryStringParams
		});
		apiGatewayIntegration[integration.uniqueId] = integration.resource;
	}
};

const transformQueryString = (result, pathname) => {
	// if the pathname has a "?", we remove split it and we add it to the array
	// When we will support multiple query string params,
	// this function will have to be re implemented
	if (pathname.includes("?")) {
		// order is important here
		result.push(pathname.substring(0, pathname.indexOf("?")));
		result.push(pathname.substring(pathname.indexOf("?")));
	} else {
		result.push(pathname);
	}
	return result;
};

const generateResources = routesObject => {
	routesObject.mappings.forEach(route => {
		const pathname = routesObject.prefix + route.route;
		const lambdaName = route.page ? route.page.replace("/", "") : "content";
		pathname
			.split("/")
			.filter(Boolean)
			.reduce(transformQueryString, [])
			.forEach((...rest) => {
				handleResource(...rest, pathname, lambdaName);
			});
	});
};

let terraformConfiguration;

/**
 * Generates the terraform configuration for the API Gateway
 *
 * @param {boolean} [write=false] Whether it writes files to the system
 * @returns
 */
function generateTerraformConfiguration(write = false) {
	const routes = getRoutes();
	generateResources(routes);

	terraformConfiguration = {
		resource: {
			aws_api_gateway_resource: apiGatewayResource,
			aws_api_gateway_method: apiGatewayMethod,
			aws_api_gateway_integration: apiGatewayIntegration
		},
		variable: {
			integrationList: {
				default: Object.keys(apiGatewayIntegration).map(
					key => `aws_api_gateway_integration.${key}`
				)
			}
		}
	};

	if (write) {
		fs.writeFileSync(
			process.cwd() + "/gateway.terraform.json",
			prettier.format(JSON.stringify(result), {
				parser: "json",
				endOfLine: "lf"
			})
		);
	} else {
		return terraformConfiguration;
	}
}

module.exports = {
	generateTerraformConfiguration
};