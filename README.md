![Herald Logo](https://github.com/Herald-Inc/herald-cli/blob/main/img/herald-logo.png)

## Overview 
Herald is an observability solution that simplifies the deployment of the ELK stack, a popular set of tools used for monitoring the health and performance of software systems. It allows software developers to conveniently collect and explore telemetry data, including logs, traces, and metrics, through a single, user-friendly interface.

In particular, Herald deploys the following applications in a distributed environment and takes care of most of the initial configuration required for these applications to work together as a single observability solution:
- Elasticsearch
- Logstash
- Kibana
- Fleet Server

Herald is deployed on AWS infrastructure, which requires that the application that will send data into Herald also be deployed on AWS infrastructure.

For more detailed information about Herald's use case, Herald's architecture, and the implementation challenges and design decisions involved in building Herald, please refer to the [case study](https://herald-app.github.io).

## Table of Contents 
- [Installation](#installation)
  - [Installing Herald](#installing-herald)
  - [Installing Filebeat](#installing-filebeat)
  - [Configuring Logstash](#configuring-logstash)
  - [Installing Elastic Agent with APM Integration](#installing-elastic-agent-with-apm-integreation)
- [Herald Architectural Overview](#herald-architectural-overview)
  - [The Herald Pipeline](#the-herald-pipeline)
    - [Data Collection and Shipment](#data-collection-and-shipment)
      - [Filebeat](#filebeat)
      - [Elastic APM Agents](#elastic-apm-agents)
    - [Data Processing and Transformation](#data-processing-and-transformation)
      - [Logstash](#logstash-for-log-data-processing)
      - [APM Server](#apm-server-for-traces-and-metrics-processing)
    - [Data Storage](#data-storage)
      - [Elasticsearch](#elasticsearch)
    - [Data Querying and Visualization](#data-querying-and-visualization)
      - [Kibana](#kibana)
  - [Bastion Host](#bastion-host)

## Installation 
### Installing Herald
Herald can be installed using the Herald CLI. For more information about how to install and deploy Herald using the CLI, see [here](https://github.com/herald-app/herald-cli).

Herald installs version 8.6 of all Elastic applications. Please note that all applications must be on the same minor version in order to work together properly.

Herald also requires that two applications be installed on the user's architecture in order to send logs, traces and metrics data to Herald.

### Installing Filebeat
To install Filebeat, please see Elastic documentation [here](https://www.elastic.co/guide/en/beats/filebeat/8.6/filebeat-installation-configuration.html) and follow instructions for a self-managed installation.

Note that Filebeat should _not_ be configured for output to Elasticsearch but rather for output to Logstash; otherwise, log data will not be processed by Logstash prior to reaching its final destination in Elasticsearch.

To configure Filebeat for output to Logstash, see Elastic documentation [here](https://www.elastic.co/guide/en/beats/filebeat/8.6/logstash-output.html). Note that you will need the DNS name for the Logstash load balancer, as Filebeat needs to know the destination address for the Logstash service. The DNS name is output to the console after deployment of the Logstash stack. The DNS name can also be ascertained in the AWS EC2 console after the Logstash stack has been deployed. 

### Configuring Logstash
While Herlad comes with a default Logstash pipeline configuration for log processing, particular use cases may require one or more different pipelines. 

Pipelines are defined in one or more `.conf` files that get placed in the `/usr/share/logstash/pipeline/` directory of the Logstash container. To configure Logstash pipelines, see Elastic documentation [here](https://www.elastic.co/guide/en/logstash/8.6/configuration.html).

To apply user created pipeline configuration files, each file must be uploaded to the `/usr/share/logstash/pipline/` directory of one of the Logstash containers. This directory is an EFS volume shared by all Logstash instances, so all Logstash instances will access the same configuration files. Accessing this volume will require using the Bastion Host to access one of the Logstash instances.

Once new pipeline configuration files have been uploaded to the appropriate directory, all Logstash container instances must be restarted in order for the new configuration files to take effect.

### Installing Elastic Agent with APM Integration 
Elastic Agent should be installed in a docker container using the docker command at the end of this section. However, in order run this command values for specific variables will need to be procured beforehand:
- Logstash loadbalancer DNS name
- Private IP address for one of the master-eligible Elasticsearch nodes (e.g., `es01`)
- Fleet Server enrollment token 

The Logstash loadbalancer DNS name is output to the terminal once the Logstash stack has been deployed. It can also be ascertained from the AWS EC2 console after deployment of the Logstash stack.

The Elasticsearch private IP address can be ascertained from the 'Networking' tab of any of the Elasticsearch tasks in the AWS ECS console. As an example, you can use the private IP address for the ES01 service.

Finally, the Fleet Server enrollment token can be obtained from the Kibana UI under Management >> Fleet >> Enrollment Tokens.

Additionally, the Elasticsearch Certificate Authority will need to be obtained. This certificate provides Elastic Agent with the proper security credentials to send data to the Elasticsearch cluster.

The CA certificate can be obtained from any of the Elasticsearch master-eligible nodes and should be obtained in the following manner:
1. SSH into any of the master-eligible Elasticsearch nodes (es01, es02, es03).
2. Copy the Elasticsearch certificates directory from the Elasticsearch container: `/usr/share/elasticsearch/config/certs/`
3. Copy the Elasticsearch certificates directory to the server where the Elastic Agent is to be installed. For example, the certificates directory might be copied into a `certs` directory in the user's home directory. This directory will then be mounted to the Docker container that runs the Elastic Agent.

Now that values for required environment variables have been obtained, as well as the Certificate Authority, Elastic Agent can be installed with the following command:

```
sudo docker run \
  --publish 8200:8200 \
  --env FLEET_ENROLL=1 \
  --env FLEET_URL=https://<LogstashLoadbalancerDNS>:8200 \
  --env FLEET_SERVER_ELASTICSEARCH_HOST=https://<ElasticsearchIP>:9200 \
  --env FLEET_ENROLLMENT_TOKEN=<EnrollmentToken> \
  --env FLEET_CA=/usr/share/elastic-agent/config/certs/ca/ca.crt \
  --env CERTIFICATE_AUTHORITIES=/usr/share/elastic-agent/config/certs/ca/ca.crt \
  --env FLEET_SERVER_ELASTICSEARCH_CA=/usr/share/elastic-agent/config/certs/ca/ca.crt \
  -v /path/to/certificates/directory/on/host:/usr/share/elastic-agent/config/certs \
  -v /var/run/docker.sock:/var/run/docker.sock \
  docker.elastic.co/beats/elastic-agent:8.6.2
```

## Herald Architectural Overview 
Herald is built on the ELK stack-- Elasticsearch for data storage and indexing, Logstash for log processing, and Kibana for data querying and visualization.

Additionally, to enable the collection of traces and metrics, Herald deploys Fleet Server for Elastic Agent enrollment and management.

Finally, to enable data collection from the user's application, specific Elastic application utilities must be installed on the user's architecture: Filebeat for log collection, and APM Server for traces and metrics collection and processing.

### The Herald Pipeline 
The Herald pipeline comprises two separate data ingestion points, one for logs and another for traces and metrics, a data storage component, and a data visualization component. 

#### Data Collection and Shipment
##### Filebeat
Filebeat is a collection agent designed for collecting and shipping log data. Its primary function is to continuously scan for new log data and send such data to Logstash, where it is processed and transformed.

Filebeat is not part of the Herald deployment but is installed separately on the user’s application servers. After installation, it must be configured to monitor specific log files and output the data to Logstash.

##### Elastic APM Agents
For collecting and shipping traces and metrics data, we have Elastic APM Agents. APM agents are open-source libraries that collect data generated by an application. These agents are written in the same programming language (e.g. Golang, Python, or Node.js) as the application and can be easily installed like any other library.

Once installed, the user then instruments their code to allow the agents to collect tracing and metrics data. The APM agents then ship the data to the APM Server for processing.

#### Data Processing and Transformation
##### Logstash for Log Data Processing
Within the Herald pipeline, Logstash is configured to ingest data from Filebeat. The user must configure Logstash with an appropriate filter that enables a specific transformation of the ingested data to support a specific application use case. For example, a user may use the “geoip” filter to add information about the geographical location of IP addresses. Once the data is processed, it is sent to Elasticsearch for storage and indexing.

Herald deploys two load-balanced instances of Logstash.

##### APM Server for Traces and Metrics Processing
The APM Server comprises two parts: the Elastic Agent and the APM Integration. Elastic Agents are installed on the user’s application servers to receive different data types, such as metrics and traces, from the APM Agents.

The Elastic Agent can be updated with configurations enabling the collection of new or different data sources. The configurations are implemented through agent policies. The APM Integration is one of those configurations that gets specified within an agent policy. The Elastic Agent with the APM Integration acts as the APM Server, which lives entirely on the user’s application server. The APM Server accepts tracing and metrics data from an APM Agent. The APM Server then processes the data, which includes validating it and transforming it into Elasticsearch documents before sending it on to Elasticsearch.

##### Fleet Server for Elastic Agent Enrollment and Management 
Fleet Server provides centralized enrollment and management of Elastic Agents. Fleet Server is responsible for continuously checking the appropriate Elasticsearch index for updated agent policies and, if found, updating Elastic Agents with the updated policies.

Herald deploys two load-balanced instances of Fleet Server.

#### Data Storage 
##### Elasticsearch
Elasticsearch is a distributed search and analytics engine and document store. It stores complex data structures serialized as JSON documents. Elasticsearch stores and indexes data in a way that enables near real-time searching (i.e. within 1 second). It is a durable data store, which means it can persist long term data as needed. Within the Herald pipeline, Elasticsearch receives data from Logstash and the APM Server. It acts as a storage component that can be queried through Kibana to be visualized.

Elasticsearch is deployed via two clusters: a 3-node cluster of master-eligible instances, and a single node cluster of data and ingestion instances, which can autoscale to a total of 12 instances as needed.

#### Data Querying and Visualization 
##### Kibana
Kibana is a powerful open-source data visualization and exploration platform. It provides a user-friendly interface for searching, analyzing, and visualizing large volumes of data in real-time. With Kibana, you can search, observe, and analyze your data, and visualize your findings in charts, gauges, maps, and graphs.

### Bastion Host 
To enable the ability to ssh into specific components of the Herald application, a Bastion Host is deployed as part of the Herald architecture. 
