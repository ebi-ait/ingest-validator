import axios from 'axios';
import IngestClient from "../src/utils/ingest-client/ingest-client";

describe('Integration Tests', () => {
    const baseURL = 'https://api.ingest.dev.archive.data.humancellatlas.org/'; // Replace with your server's URL

    it('should successfully fetch root resource from the live server', async () => {
        try {
            const response = await axios.get(`${baseURL}/`);
            expect(response.status).toBe(200);
        } catch (error) {
            throw new Error(`Request failed: ${error.message}`);
        }
    });
    it('should get all projects', async () => {
        try {
            const ingestClient = IngestClient.fromConfig();
            const projects = await ingestClient.retrieve('/projects');
            expect(projects).toHaveProperty("page", )
            expect(projects).toHaveProperty("_embedded")
            expect(projects._embedded).toHaveProperty("projects")
        } catch (error) {
            throw new Error(`Request failed: ${error.message}`);
        }
    });

});
