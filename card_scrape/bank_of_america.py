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
    href = 'https://www.bankofamerica.com/credit-cards/#filter'
    driver = webdriver.Firefox(firefox_binary=FirefoxBinary(ff_path))

    driver.get(href)
    driver.execute_script("""
        while(!document.getElementsByClassName('card-info')) {}
    """)

    # ajax done loading cards
    f = open('html_dumps/bank_of_america.html', 'w')
    f.write(driver.page_source)
    f.close()
    driver.quit()
    process = Popen([
        'node',
        'bank_of_america.js',
        'html_dumps/bank_of_america.html'
    ])
    process.communicate()
    process.kill()

if __name__ == '__main__':
    main(sys.argv[1])
