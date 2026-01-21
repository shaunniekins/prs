import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { fileURLToPath } from "url";
import { parse } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Environment Variable Validator and Data Fetcher
 * Reads .env file, validates variables, and fetches data from configured sources
 */

class EnvValidator {
  constructor() {
    this.envPath = path.join(process.cwd(), ".env");
    this.envExamplePath = path.join(process.cwd(), ".env.example");
    this.envVariables = {};
    this.validationResults = [];
    this.fetchResults = [];
    this.logs = [];
  }

  /**
   * Log a message with timestamp
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data }),
    };

    this.logs.push(logEntry);
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);

    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  /**
   * Parse environment variables from .env file
   */
  parseEnvFile() {
    try {
      if (!fs.existsSync(this.envPath)) {
        throw new Error(".env file not found");
      }

      const envContent = fs.readFileSync(this.envPath, "utf8");
      const lines = envContent
        .split("\n")
        .filter((line) => line.trim() && !line.trim().startsWith("#"));

      this.log(
        "info",
        `Found ${lines.length} environment variable(s) in .env file`
      );

      for (const line of lines) {
        const [key, ...valueParts] = line.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").trim();
          this.envVariables[key.trim()] = value;

          this.log("debug", `Parsed variable: ${key.trim()}`);
        }
      }

      this.log(
        "info",
        `Successfully parsed ${
          Object.keys(this.envVariables).length
        } environment variables`
      );
      return true;
    } catch (error) {
      this.log("error", "Failed to parse .env file", { error: error.message });
      return false;
    }
  }

  /**
   * Validate environment variable presence and format
   * Uses new Supabase API key format (publishable/secret keys)
   */
  validateVariables() {
    try {
      // Expected variables - new Supabase key format only
      const expectedVariables = {
        SUPABASE_URL: {
          required: true,
          format: /^https:\/\/[a-z0-9-]+\.supabase\.co$/,
          description: "Supabase project URL",
        },
        SUPABASE_SECRET_KEY: {
          required: true,
          format: /^sb_secret_[A-Za-z0-9_-]+$/,
          description: "Supabase secret key (format: sb_secret_xxx)",
        },
        VITE_SUPABASE_PUBLISHABLE_KEY: {
          required: true,
          format: /^sb_publishable_[A-Za-z0-9_-]+$/,
          description: "Supabase publishable key (format: sb_publishable_xxx)",
        },
        PORT: {
          required: false,
          format: /^\d+$/,
          description: "Server port number",
        },
        NODE_ENV: {
          required: false,
          format: /^(development|production|test)$/,
          description: "Node environment",
        },
        JWT_SECRET: {
          required: false,
          format: /^.+$/,
          description: "JWT secret key",
        },
      };

      this.log("info", "Starting environment variable validation");

      for (const [varName, config] of Object.entries(expectedVariables)) {
        const value = this.envVariables[varName];
        const result = {
          variable: varName,
          present: !!value,
          valid: false,
          value: value,
          description: config.description,
          errors: [],
        };

        // Check presence for required variables
        if (config.required && !value) {
          result.errors.push(`Required variable ${varName} is missing`);
        }

        // Validate format if present
        if (value) {
          if (config.format && !config.format.test(value)) {
            result.errors.push(`Invalid format for ${varName}`);
          } else {
            result.valid = true;
          }
        } else if (!config.required) {
          result.valid = true; // Optional variables are valid if missing
        }

        this.validationResults.push(result);

        if (result.errors.length > 0) {
          this.log("warn", `Validation issues for ${varName}`, {
            errors: result.errors,
          });
        } else {
          this.log("debug", `Validation passed for ${varName}`);
        }
      }

      const validCount = this.validationResults.filter((r) => r.valid).length;
      const totalCount = this.validationResults.length;

      this.log(
        "info",
        `Validation completed: ${validCount}/${totalCount} variables valid`
      );

      return validCount === totalCount;
    } catch (error) {
      this.log("error", "Validation process failed", { error: error.message });
      return false;
    }
  }

  /**
   * Fetch data from Supabase
   */
  async fetchSupabaseData() {
    try {
      const supabaseUrl = this.envVariables.SUPABASE_URL;
      const supabaseKey = this.envVariables.SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        this.log("warn", "Cannot fetch Supabase data: missing URL or API key");
        return false;
      }

      this.log("info", "Attempting to fetch data from Supabase");

      // Test basic connectivity by making a simple request
      const testUrl = `${supabaseUrl}/rest/v1/`;

      const fetchData = () => {
        return new Promise((resolve, reject) => {
          const url = parse(testUrl);
          const client = url.protocol === "https:" ? https : http;

          const options = {
            hostname: url.hostname,
            path: url.path,
            method: "GET",
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
            },
            timeout: 10000, // 10 second timeout
          };

          const req = client.request(options, (res) => {
            let data = "";

            res.on("data", (chunk) => {
              data += chunk;
            });

            res.on("end", () => {
              try {
                const responseData = JSON.parse(data);
                resolve({
                  statusCode: res.statusCode,
                  headers: res.headers,
                  data: responseData,
                });
              } catch (parseError) {
                resolve({
                  statusCode: res.statusCode,
                  headers: res.headers,
                  data: data,
                });
              }
            });
          });

          req.on("error", (error) => {
            reject(error);
          });

          req.on("timeout", () => {
            req.destroy();
            reject(new Error("Request timeout"));
          });

          req.end();
        });
      };

      const response = await fetchData();

      const result = {
        source: "Supabase",
        url: supabaseUrl,
        statusCode: response.statusCode,
        success: response.statusCode >= 200 && response.statusCode < 300,
        responseTime: Date.now(),
        data: response.data,
      };

      this.fetchResults.push(result);

      if (result.success) {
        this.log("info", "Successfully connected to Supabase", {
          statusCode: result.statusCode,
          url: result.url,
        });
      } else {
        this.log("error", "Failed to connect to Supabase", {
          statusCode: result.statusCode,
          url: result.url,
        });
      }

      return result.success;
    } catch (error) {
      this.log("error", "Error fetching Supabase data", {
        error: error.message,
      });
      this.fetchResults.push({
        source: "Supabase",
        error: error.message,
        success: false,
      });
      return false;
    }
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalVariables: this.validationResults.length,
        validVariables: this.validationResults.filter((r) => r.valid).length,
        fetchOperations: this.fetchResults.length,
        successfulFetches: this.fetchResults.filter((r) => r.success).length,
        totalLogs: this.logs.length,
      },
      validation: {
        results: this.validationResults,
        allValid: this.validationResults.every((r) => r.valid),
      },
      dataFetching: {
        results: this.fetchResults,
        allSuccessful: this.fetchResults.every((r) => r.success),
      },
      logs: this.logs,
      recommendations: [],
    };

    // Generate recommendations
    if (!this.envVariables.PORT) {
      report.recommendations.push(
        "Consider setting PORT variable for server configuration"
      );
    }

    if (!this.envVariables.NODE_ENV) {
      report.recommendations.push(
        "Consider setting NODE_ENV variable (development/production/test)"
      );
    }

    if (!this.envVariables.JWT_SECRET) {
      report.recommendations.push(
        "Consider setting JWT_SECRET for production security"
      );
    }

    const missingRequired = this.validationResults.filter((r) =>
      r.errors.includes(`Required variable ${r.variable} is missing`)
    );
    if (missingRequired.length > 0) {
      report.recommendations.push(
        `Missing required variables: ${missingRequired
          .map((r) => r.variable)
          .join(", ")}`
      );
    }

    return report;
  }

  /**
   * Run complete validation and data fetching process
   */
  async run() {
    this.log(
      "info",
      "Starting environment validation and data fetching process"
    );

    // Step 1: Parse .env file
    const parsed = this.parseEnvFile();
    if (!parsed) {
      this.log("error", "Cannot continue: Failed to parse .env file");
      return this.generateReport();
    }

    // Step 2: Validate variables
    const validated = this.validateVariables();

    // Step 3: Fetch data from sources
    await this.fetchSupabaseData();

    // Step 4: Generate and return report
    const report = this.generateReport();

    this.log("info", "Process completed", {
      validVariables: report.summary.validVariables,
      totalVariables: report.summary.totalVariables,
      successfulFetches: report.summary.successfulFetches,
      totalFetches: report.summary.fetchOperations,
    });

    return report;
  }
}

export default EnvValidator;

// If run directly, execute the validation
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new EnvValidator();
  validator
    .run()
    .then((report) => {
      console.log("\n=== FINAL REPORT ===");
      console.log(JSON.stringify(report, null, 2));

      // Exit with appropriate code
      const hasErrors =
        report.logs.some((log) => log.level === "error") ||
        !report.validation.allValid ||
        !report.dataFetching.allSuccessful;

      process.exit(hasErrors ? 1 : 0);
    })
    .catch((error) => {
      console.error("Unexpected error:", error);
      process.exit(1);
    });
}
