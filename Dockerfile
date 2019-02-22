FROM dnguyenv/detectbase
MAINTAINER Duy Nguyen <dnguyenv@us.ibm.com>

RUN pip install prometheus_client \
requests

ADD . /code

WORKDIR /code
EXPOSE 5000

ENTRYPOINT ["/usr/bin/python", "app.py"]
