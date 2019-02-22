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
setup_metrics(app)
CONTENT_TYPE_LATEST = str('text/plain; version=0.0.4; charset=utf-8')

@app.route('/metrics/')
def metrics():
    return Response(prometheus_client.generate_latest(), mimetype=CONTENT_TYPE_LATEST)
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


@app.route('/local')
def local():
    return Response(open('./static/local.html').read(), mimetype="text/html")

@app.route('/<metrics>')
def get_ip(metrics):
#    metrics = ipaddress.ip_address(metrics)
    if metrics!='favicon.ico':
       object_detection_api.get_ip(metrics)
       pass
    return Response(open('./static/local.html').read(), mimetype="text/html")

@app.route('/video')
def remote():
    return Response(open('./static/video.html').read(), mimetype="text/html")


@app.route('/test')
def test():
    PATH_TO_TEST_IMAGES_DIR = 'object_detection/test_images'  # cwh
    TEST_IMAGE_PATHS = [os.path.join(PATH_TO_TEST_IMAGES_DIR, 'image{}.jpg'.format(i)) for i in range(1, 3)]

    image = Image.open(TEST_IMAGE_PATHS[0])
    objects = object_detection_api.get_objects(image)

    return objects


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
        objects = object_detection_api.get_objects(image_object,start_time,threshold)
        
        detection_time = time.time() - s_time;
        objects_detection = json.loads(objects)
        objects_detection.append({ 'detection_time': detection_time })
        respJson = json.dumps(objects_detection)
        
        return respJson

    except Exception as e:
        print('POST /image error: %e' % e)
        return e


@app.route('/influx', methods=['POST'])
def influx():
    try:
        data_influx = request.form.get('data')  # get the image
        print ("data from influx")
        print (data_influx)
        object_detection_api.postInflux(data_influx)
        return 'ok'
    except Exception as e:
        print('POST /influx error: ' + e)
        return e       


if __name__ == '__main__':
	# without SSL
    app.run(port=5000, host='0.0.0.0')#, ssl_context='adhoc')

	# with SSL
    #app.run(debug=True, host='0.0.0.0', ssl_context=('ssl/server.crt', 'ssl/server.key'))
