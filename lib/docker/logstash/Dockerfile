FROM docker.elastic.co/logstash/logstash:8.6.2

USER root
RUN apt-get update
RUN apt-get install -y vim
RUN apt-get install -y nano
RUN rm -f /usr/share/logstash/pipeline/logstash.conf

USER logstash
COPY pipeline/ /usr/share/logstash/pipeline/
COPY config/ /usr/share/logstash/config/
