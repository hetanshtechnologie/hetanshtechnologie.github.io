-- =============================================================
-- Jobs table for the careers / apply page
-- Public can read active jobs; admin (hetanshtechnologie@gmail.com) manages them.
-- =============================================================

CREATE TABLE IF NOT EXISTS jobs (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  summary TEXT DEFAULT '',
  description TEXT DEFAULT '',
  type TEXT DEFAULT 'Full-time',
  location TEXT DEFAULT 'Remote',
  experience TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Jobs public read" ON jobs;
CREATE POLICY "Jobs public read" ON jobs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin insert jobs" ON jobs;
CREATE POLICY "Admin insert jobs" ON jobs FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = 'hetanshtechnologie@gmail.com');

DROP POLICY IF EXISTS "Admin update jobs" ON jobs;
CREATE POLICY "Admin update jobs" ON jobs FOR UPDATE USING (auth.jwt() ->> 'email' = 'hetanshtechnologie@gmail.com');

DROP POLICY IF EXISTS "Admin delete jobs" ON jobs;
CREATE POLICY "Admin delete jobs" ON jobs FOR DELETE USING (auth.jwt() ->> 'email' = 'hetanshtechnologie@gmail.com');

GRANT SELECT ON jobs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON jobs TO authenticated;

-- =============================================================
-- Seed data
-- =============================================================
INSERT INTO jobs (title, summary, description, type, location, experience) VALUES
('Senior Full-Stack Developer',
 'Experience with .NET Core, Angular/React, and cloud platforms required.',
 'Key Responsibilities:
- Design, develop, and maintain full-stack web applications using .NET Core and Angular/React
- Build RESTful APIs and microservices architecture
- Collaborate with cross-functional teams to define and ship new features
- Optimize application performance and scalability
- Mentor junior developers and conduct code reviews
- Participate in architecture discussions and technical decision-making

Requirements:
- 5+ years of professional software development experience
- Strong proficiency in C#, .NET Core, Entity Framework, SQL Server
- Experience with Angular (2+) or React with TypeScript
- Hands-on with cloud platforms (Azure preferred)
- Experience with CI/CD pipelines and version control (Git)
- Strong problem-solving and communication skills

Nice to Have:
- Experience with Docker and Kubernetes
- Knowledge of NoSQL databases (Cosmos DB, MongoDB)
- Experience with Azure DevOps / GitHub Actions',
 'Full-time', 'Remote', '5+ years'),

('Cloud Solutions Architect',
 'Design and implement cloud-native solutions on Azure/AWS/GCP.',
 'Key Responsibilities:
- Design scalable, secure, and cost-effective cloud architectures on Azure/AWS/GCP
- Lead cloud migration and modernization initiatives
- Define cloud governance, security policies, and best practices
- Create architectural blueprints, RFPs, and technical documentation
- Guide development teams on cloud-native design patterns
- Evaluate and recommend cloud services and tools

Requirements:
- 8+ years of IT experience with 3+ years in cloud architecture
- Deep expertise in at least one major cloud (Azure preferred)
- Experience with microservices, containers (Docker, Kubernetes), and serverless
- Knowledge of networking, IAM, and security best practices
- Experience with Infrastructure as Code (Terraform, Bicep, ARM)
- Cloud certification (Azure Solutions Architect or equivalent)

Nice to Have:
- Multi-cloud experience (Azure + AWS/GCP)
- Experience with AI/ML infrastructure on cloud
- TOGAF or similar architecture certification',
 'Full-time', 'Hybrid', '8+ years'),

('AI/ML Engineer',
 'Work with LLMs, LangChain, and develop AI-powered applications.',
 'Key Responsibilities:
- Develop and deploy AI/ML models with focus on LLMs and generative AI
- Build RAG pipelines using LangChain, LlamaIndex, and vector databases
- Fine-tune large language models for domain-specific applications
- Design and implement AI agents and multi-agent systems
- Evaluate model performance and implement monitoring
- Collaborate with product teams to identify AI use cases

Requirements:
- 3+ years of experience in AI/ML or data science
- Proficiency in Python and ML frameworks (PyTorch, TensorFlow)
- Experience with LangChain, vector databases (Pinecone, Weaviate, Cosmos DB)
- Familiarity with Azure OpenAI, AWS Bedrock, or similar
- Understanding of RAG, prompt engineering, and model fine-tuning
- Strong analytical and problem-solving skills

Nice to Have:
- Experience with Azure AI Search, AI Document Intelligence
- Knowledge of MLOps and model deployment pipelines
- Published research or contributions to open-source AI projects',
 'Full-time', 'Remote', '3+ years'),

('DevOps Engineer',
 'Kubernetes, Docker, CI/CD pipelines, and infrastructure automation.',
 'Key Responsibilities:
- Design and manage CI/CD pipelines using Azure DevOps, GitHub Actions, or Jenkins
- Manage Kubernetes clusters (AKS, EKS, GKE) and containerized workloads
- Automate infrastructure provisioning with Terraform, Bicep, or Ansible
- Implement monitoring, logging, and alerting (Prometheus, Grafana, ELK)
- Ensure system security, compliance, and disaster recovery
- Optimize cloud costs and resource utilization

Requirements:
- 4+ years of DevOps or SRE experience
- Strong knowledge of Docker, Kubernetes, and Helm
- Hands-on with Azure cloud services (AKS, VNet, Azure DevOps)
- Proficiency in scripting (Bash, PowerShell, Python)
- Experience with Git and Git workflows
- Understanding of networking, security, and identity management

Nice to Have:
- Experience with service mesh (Istio, Linkerd)
- Knowledge of ArgoCD or GitOps practices
- Cloud certification (Azure DevOps Engineer or equivalent)',
 'Full-time', 'On-site', '4+ years'),

('Angular Developer',
 'Build dynamic SPAs with Angular, TypeScript, RxJS, and NgRx.',
 'Key Responsibilities:
- Build responsive, high-performance SPAs using Angular and TypeScript
- Implement state management with NgRx or Akita
- Integrate RESTful APIs and handle reactive data streams with RxJS
- Write unit and integration tests (Jasmine, Karma, Cypress)
- Optimize application performance and bundle size
- Collaborate with UX designers and backend developers

Requirements:
- 3+ years of experience with Angular (2+) and TypeScript
- Strong understanding of RxJS, observables, and reactive programming
- Experience with NgRx or similar state management libraries
- Proficiency in HTML5, CSS3/Sass, and responsive design
- Experience with RESTful API integration and HTTP interceptors
- Familiarity with Git and Agile development practices

Nice to Have:
- Experience with Angular Universal / SSR
- Knowledge of .NET Core or Node.js for full-stack development
- Experience with Azure Static Web Apps or App Service',
 'Full-time', 'Remote', '3+ years'),

('React Developer',
 'Develop modern UIs with React, Redux, TypeScript, and GraphQL.',
 'Key Responsibilities:
- Build modern, responsive UIs using React, Redux, and TypeScript
- Develop reusable component libraries and design systems
- Integrate with REST and GraphQL APIs
- Implement client-side routing, authentication, and data caching
- Write comprehensive tests (Jest, React Testing Library, Cypress)
- Optimize performance with code splitting, lazy loading, and memoization

Requirements:
- 3+ years of experience with React and TypeScript
- Strong understanding of Redux, React Query, or Zustand
- Proficiency in HTML5, CSS3, Tailwind CSS, and responsive design
- Experience with REST and GraphQL API integration
- Knowledge of modern build tools (Vite, Webpack, Babel)
- Familiarity with Git and Agile development practices

Nice to Have:
- Experience with Next.js or Remix
- Knowledge of Node.js or .NET Core for full-stack development
- Experience with Azure Static Web Apps or Vercel',
 'Full-time', 'Remote', '3+ years'),

('.NET Core Developer',
 'Build scalable APIs and microservices with .NET Core, C#, and SQL.',
 'Key Responsibilities:
- Design and develop RESTful APIs and microservices using .NET Core / .NET 8+
- Implement data access with Entity Framework Core and Dapper
- Write clean, testable, and maintainable C# code following SOLID principles
- Integrate with SQL Server, Azure SQL, and message brokers (Azure Service Bus, RabbitMQ)
- Implement authentication and authorization (JWT, Identity, Azure AD)
- Write unit and integration tests (xUnit, Moq, FluentAssertions)

Requirements:
- 3+ years of experience with .NET Core / .NET and C#
- Strong understanding of ASP.NET Core Web API and middleware pipeline
- Experience with Entity Framework Core and SQL Server
- Knowledge of RESTful API design, versioning, and OpenAPI/Swagger
- Familiarity with dependency injection, logging, and configuration patterns
- Experience with Git and CI/CD pipelines

Nice to Have:
- Experience with Azure Functions, App Service, or Container Apps
- Knowledge of Docker and containerization
- Experience with Angular or React for full-stack development',
 'Full-time', 'Remote', '3+ years'),

('General Application',
 'We''re always looking for talented individuals. Send us your resume and we''ll keep you in mind for future opportunities.',
 'We''re always looking for talented individuals. If you don''t see a role that fits your skills, send us your resume and we will keep you in mind for future opportunities.

Please use the Cover Letter section to tell us about:
- Your background and the type of role you are looking for
- Your key skills and technologies
- Your availability and preferred work mode (remote, hybrid, on-site)
- Anything else you''d like us to know',
 'Full-time', 'Remote', '')

ON CONFLICT (title) DO UPDATE SET
  summary = EXCLUDED.summary,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  location = EXCLUDED.location,
  experience = EXCLUDED.experience,
  is_active = TRUE,
  updated_at = NOW();
