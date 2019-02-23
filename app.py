import api
import os
from PIL import Image
from flask import Flask, request, Response
from helpers.middleware import setup_metrics
import prometheus_client
import ipaddress
import time
import json


app = Flask(__name__)
#setup_metrics(app)
CONTENT_TYPE_LATEST = str('text/plain; version=0.0.4; charset=utf-8')

# for CORS
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST') # Put any other methods you need here
    return response


@app.route('/')
def index():
    return Response('Tensor Flow object detection')


@app.route('/detect')
def detect():
    return Response(open('./static/app.html').read(), mimetype="text/html")

@app.route('/image', methods=['POST'])
def image():
    try:
        s_time = time.time();
        start_time = int(round(time.time() * 1000))
        image_file = request.files['image']  # get the image

        # Set an image confidence threshold value to limit returned data
        threshold = request.form.get('threshold')
        if threshold is None:
            threshold = 0.5
        else:
            threshold = float(threshold)

        # finally run the image through tensor flow object detection`
        image_object = Image.open(image_file)
        objects = api.get_objects(image_object,start_time,threshold)
        
        detection_time = time.time() - s_time;
        objects_detection = json.loads(objects)
        objects_detection.append({ 'detection_time': detection_time })
        respJson = json.dumps(objects_detection)
        
        return respJson

    except Exception as e:
        print(e)
        return e

if __name__ == '__main__':
	# without SSL
    app.run(port=5000, host='0.0.0.0', ssl_context='adhoc')

	# with SSL
    #app.run(debug=True, host='0.0.0.0', ssl_context=('ssl/server.crt', 'ssl/server.key'))
