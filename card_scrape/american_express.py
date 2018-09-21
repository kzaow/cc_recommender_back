import sys

from selenium import webdriver
from selenium.webdriver.firefox.firefox_binary import FirefoxBinary

from subprocess import Popen


def main(ff_path):
    """Loads card data and calls child process to parse it.

    Args:
        ff_path (str): Path to Firefox binary.

    Returns:

    Raises:
    """
    href = 'https://www.americanexpress.com/us/credit-cards/view-all-personal-cards/'
    driver = webdriver.Firefox(firefox_binary=FirefoxBinary(ff_path))

    driver.get(href)
    driver.execute_script("""
        while(!document.getElementsByClassName('amex-card-m')) {}
    """)

    # ajax done loading cards
    f = open('html_dumps/american_express.html', 'w')
    f.write(driver.page_source.encode('ascii', 'ignore').decode('utf-8'))
    f.close()
    driver.quit()
    process = Popen([
        'node',
        'american_express.js',
        'html_dumps/american_express.html'
    ])
    process.communicate()
    process.kill()

if __name__ == '__main__':
    main(sys.argv[1])
